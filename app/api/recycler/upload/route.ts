import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

async function readJson(file: string, fallback: any) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: any) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function stableJson(obj: any) {
  const sortKeys = (x: any): any => {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === "object") {
      return Object.keys(x)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = sortKeys(x[k]);
          return acc;
        }, {});
    }
    return x;
  };
  return JSON.stringify(sortKeys(obj));
}

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function computeVersionHash(prevHash: string, payloadHash: string, tsIso: string) {
  return sha256Hex(`${prevHash}|${payloadHash}|${tsIso}`);
}

function stripVersionMeta(versionLike: any) {
  const cloned = JSON.parse(JSON.stringify(versionLike || {}));

  delete cloned.hash;
  delete cloned.prevHash;
  delete cloned.payloadHash;
  delete cloned.batchVersionId;
  delete cloned.ts;
  delete cloned.signatures;
  delete cloned.signature;
  delete cloned.signer;
  delete cloned.signerName;
  delete cloned.alg;
  delete cloned.kid;
  delete cloned.ots;
  delete cloned.onChain;
  delete cloned.event;
  delete cloned.events;

  return cloned;
}

function latestByBatch(records: any[], batchId: string) {
  const same = records.filter((r) => String(r?.batchId) === batchId);
  same.sort(
    (a, b) =>
      Number(new Date(b?.ts || 0)) - Number(new Date(a?.ts || 0))
  );
  return same[0] || null;
}

function signBase64(message: string) {
  const pemRaw =
    process.env.RECYCLER_PRIVATE_KEY_PEM ||
    process.env.PRIVATE_KEY_PEM ||
    "";

  if (!pemRaw) throw new Error("PRIVATE_KEY_MISSING");

  const pem = pemRaw.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);
  return sig.toString("base64");
}

async function triggerAutoPipeline(batchId: string) {
  try {
    const origin = process.env.APP_BASE_URL || "http://localhost:3000";

    const resp = await fetch(`${origin}/api/pipeline/auto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId }),
    });

    const json = await resp.json().catch(() => null);

    return {
      ok: resp.ok && json?.ok !== false,
      status: resp.status,
      result: json,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: "AUTO_PIPELINE_FAILED",
      message: String(err?.message || err),
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || body?.id || "").trim();

    const recycler =
      body?.recycler && typeof body.recycler === "object"
        ? body.recycler
        : {
            id: String(body?.recyclerId || "R1"),
            name: String(body?.recyclerName || "GreenCycle Station"),
          };

    const material = String(body?.material || "PET").trim();
    const kg = Number(body?.kg ?? 20);

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    if (!recycler || typeof recycler !== "object") {
      return NextResponse.json(
        { ok: false, error: "MISSING_RECYCLER_PAYLOAD" },
        { status: 400 }
      );
    }

    const chain = await readJson(CHAIN_FILE, []);
    const versionsDb = await readJson(BATCH_VERSIONS_FILE, { records: [] });

    const rows: any[] = Array.isArray(chain) ? chain : [];
    const records: any[] = Array.isArray(versionsDb?.records)
      ? versionsDb.records
      : [];

    let chainIdx = rows.findIndex((r: any) => String(r?.id) === batchId);

    const nowIso = new Date().toISOString();

    // ✅ 如果 chain.json 還沒有這個 batch，就建立新批次快照
    if (chainIdx < 0) {
      rows.push({
        id: batchId,
        batchId,
        material,
        kg,
        recycler: {
          ...recycler,
          ts: nowIso,
        },
        ts: nowIso,
        created_at: nowIso,
        audit: {
          status: "pending",
        },
      });

      chainIdx = rows.length - 1;
    }

    const previousVersion = latestByBatch(records, batchId);

    const base = previousVersion
      ? stripVersionMeta(previousVersion)
      : JSON.parse(JSON.stringify(rows[chainIdx]));

    base.id = batchId;
    base.batchId = batchId;
    base.material = base.material || material;
    base.kg = base.kg ?? kg;

    // ✅ recycler API 只更新 recycler 欄位
    base.recycler = {
      ...(base.recycler || {}),
      ...recycler,
      ts: nowIso,
    };

    const payloadHash = sha256Hex(stableJson(base));
    const prevHash = String(previousVersion?.hash || "");
    const hash = computeVersionHash(prevHash, payloadHash, nowIso);
    const batchVersionId = `${batchId}@${nowIso}`;

    const signature = signBase64(hash);

    const event = {
      type: "recycler.upload",
      action: "recycler_updated",
      ts: nowIso,
      role: "recycler",
      by: String(recycler?.name || "Recycler"),
      note: body?.note || null,
      data: {
        recycler,
      },
    };

    const prevEvents = Array.isArray(previousVersion?.events)
      ? previousVersion.events
      : [];

    const newVersion = {
      ...base,
      batchId,
      batchVersionId,
      ts: nowIso,
      prevHash: prevHash || null,
      payloadHash,
      hash,

      signatures: [
        {
          role: "recycler",
          signer: String(process.env.RECYCLER_DID || "did:web:recycler.local"),
          signerName: String(recycler?.name || "Recycler"),
          alg: "RSA-SHA256",
          kid: String(process.env.RECYCLER_KID || "recycler-key-1"),
          ts: nowIso,
          signature,
        },
      ],

      signature,
      signer: "recycler",
      signerName: String(recycler?.name || "Recycler"),
      alg: "RSA-SHA256",

      events: [...prevEvents, event],
      event,

      ots: null,
      onChain: null,
    };

    records.push(newVersion);
    await writeJson(BATCH_VERSIONS_FILE, { records });

    // ✅ chain.json 只當最新快照
    rows[chainIdx] = {
      ...rows[chainIdx],
      ...stripVersionMeta(newVersion),
      id: batchId,
      batchId,
      recycler: newVersion.recycler,
    };

    await writeJson(CHAIN_FILE, rows);

    // ✅ 新增 / 上傳回收資料後，自動跑完整 pipeline
    const autoPipeline = await triggerAutoPipeline(batchId);

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId,
      batchVersionHash: hash,
      recycler: newVersion.recycler,
      autoPipeline,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "RECYCLER_UPLOAD_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}