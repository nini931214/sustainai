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
  same.sort((a, b) => Number(new Date(b?.ts || 0)) - Number(new Date(a?.ts || 0)));
  return same[0] || null;
}

function signBase64(message: string) {
  const pemRaw =
    process.env.PROCESSOR_PRIVATE_KEY_PEM ||
    process.env.PRIVATE_KEY_PEM ||
    "";

  if (!pemRaw) throw new Error("PRIVATE_KEY_MISSING");

  const pem = pemRaw.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);
  return sig.toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || body?.id || "").trim();
    const processor = body?.processor || null;

    if (!batchId) {
      return NextResponse.json({ ok: false, error: "MISSING_BATCH_ID" }, { status: 400 });
    }

    if (!processor || typeof processor !== "object") {
      return NextResponse.json(
        { ok: false, error: "MISSING_PROCESSOR_PAYLOAD" },
        { status: 400 }
      );
    }

    const chain = await readJson(CHAIN_FILE, []);
    const versionsDb = await readJson(BATCH_VERSIONS_FILE, { records: [] });

    const rows: any[] = Array.isArray(chain) ? chain : [];
    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

    const chainIdx = rows.findIndex((r: any) => String(r?.id) === batchId);
    if (chainIdx < 0) {
      return NextResponse.json({ ok: false, error: "BATCH_NOT_FOUND", batchId }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const previousVersion = latestByBatch(records, batchId);

    const base =
      previousVersion
        ? stripVersionMeta(previousVersion)
        : JSON.parse(JSON.stringify(rows[chainIdx]));

    base.id = batchId;
    base.batchId = batchId;

    // ✅ 只更新 processor 區塊
    base.processor = {
      ...(base.processor || {}),
      ...processor,
      ts: nowIso,
    };

    const payloadHash = sha256Hex(stableJson(base));
    const prevHash = String(previousVersion?.hash || "");
    const hash = computeVersionHash(prevHash, payloadHash, nowIso);
    const batchVersionId = `${batchId}@${nowIso}`;

    const signature = signBase64(hash);
    const event = {
      type: "processor.upload",
      action: "processor_updated",
      ts: nowIso,
      role: "processor",
      by: String(processor?.name || "Processor"),
      note: body?.note || null,
      data: { processor },
    };

    const prevEvents = Array.isArray(previousVersion?.events) ? previousVersion.events : [];

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
          role: "processor",
          signer: String(process.env.PROCESSOR_DID || "did:web:processor.local"),
          signerName: String(processor?.name || "Processor"),
          alg: "RSA-SHA256",
          kid: String(process.env.PROCESSOR_KID || "processor-key-1"),
          ts: nowIso,
          signature,
        },
      ],
      signature,
      signer: "processor",
      signerName: String(processor?.name || "Processor"),
      alg: "RSA-SHA256",
      events: [...prevEvents, event],
      event,
      ots: null,
      onChain: null,
    };

    records.push(newVersion);
    await writeJson(BATCH_VERSIONS_FILE, { records });

    rows[chainIdx] = {
      ...rows[chainIdx],
      ...stripVersionMeta(newVersion),
      id: batchId,
      processor: newVersion.processor,
    };
    await writeJson(CHAIN_FILE, rows);

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId,
      batchVersionHash: hash,
      processor: newVersion.processor,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROCESSOR_UPLOAD_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}