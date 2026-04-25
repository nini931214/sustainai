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

function normalizeStatus(input: any): "approved" | "rejected" | "pending" {
  const s = String(input || "").trim().toLowerCase();

  if (s === "通過" || s === "approved") return "approved";
  if (s === "退回" || s === "rejected") return "rejected";
  if (s === "待審" || s === "pending") return "pending";

  return "pending";
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

function signBase64(message: string) {
  const pemRaw =
    process.env.AUDITOR_PRIVATE_KEY_PEM ||
    process.env.PRIVATE_KEY_PEM ||
    "";

  if (!pemRaw) throw new Error("PRIVATE_KEY_MISSING");

  const pem = pemRaw.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);
  return sig.toString("base64");
}

function buildAuditEvent(params: {
  ts: string;
  by: string;
  status: "approved" | "rejected" | "pending";
  note: string;
  prevStatus: string | null;
}) {
  return {
    type: "admin.audit",
    action: "audit_status_changed",
    ts: params.ts,
    role: "auditor",
    by: params.by,
    note: params.note || null,
    data: {
      prevStatus: params.prevStatus,
      nextStatus: params.status,
    },
  };
}

function latestByBatch(records: any[], batchId: string) {
  const same = records.filter((r) => String(r?.batchId) === batchId);
  same.sort((a, b) => Number(new Date(b?.ts || 0)) - Number(new Date(a?.ts || 0)));
  return same[0] || null;
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || body?.id || "").trim();
    const status = normalizeStatus(body?.status);
    const note = String(body?.note || "").trim();
    const auditorName = String(body?.auditorName || body?.by || "ESG Auditor").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    const chain = await readJson(CHAIN_FILE, []);
    const versionsDb = await readJson(BATCH_VERSIONS_FILE, { records: [] });

    const rows: any[] = Array.isArray(chain) ? chain : [];
    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

    const chainIdx = rows.findIndex((r: any) => String(r?.id) === batchId);
    if (chainIdx < 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_NOT_FOUND",
          batchId,
        },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();
    const previousVersion = latestByBatch(records, batchId);

    // ✅ 以「上一版內容」或「chain 快照」為基底，建立新版本內容
    const base =
      previousVersion
        ? stripVersionMeta(previousVersion)
        : JSON.parse(JSON.stringify(rows[chainIdx]));

    // ✅ 稽核方只改 audit，不碰 recycler / processor / manufacturer
    const prevStatus = String(base?.audit?.status || rows[chainIdx]?.audit?.status || null);
    base.id = batchId;
    base.batchId = batchId;
    base.audit = {
      ...(base.audit || {}),
      status,
      by: auditorName,
      note: note || null,
      ts: nowIso,
    };

    // ✅ append-only version
    const payloadHash = sha256Hex(stableJson(base));
    const prevHash = String(previousVersion?.hash || "");
    const hash = computeVersionHash(prevHash, payloadHash, nowIso);
    const batchVersionId = `${batchId}@${nowIso}`;

    const signature = signBase64(hash);
    const event = buildAuditEvent({
      ts: nowIso,
      by: auditorName,
      status,
      note,
      prevStatus: prevStatus || null,
    });

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
          role: "auditor",
          signer: String(process.env.AUDITOR_DID || "did:web:auditor.local"),
          signerName: auditorName,
          alg: "RSA-SHA256",
          kid: String(process.env.AUDITOR_KID || "auditor-key-1"),
          ts: nowIso,
          signature,
        },
      ],

      // 相容舊欄位
      signature,
      signer: "auditor",
      signerName: auditorName,
      alg: "RSA-SHA256",

      events: [...prevEvents, event],
      event,

      ots: null,
      onChain: null,
    };

    records.push(newVersion);
    await writeJson(BATCH_VERSIONS_FILE, { records });

    // ✅ chain.json 只更新最新快照（不是主真相）
    rows[chainIdx] = {
      ...rows[chainIdx],
      ...stripVersionMeta(newVersion),
      id: batchId,
      audit: newVersion.audit,
    };
    await writeJson(CHAIN_FILE, rows);

    let anchored = false;
    let anchorResult: any = null;

    // ✅ 只有 approved 才自動上鏈
    if (status === "approved") {
      try {
        const origin = process.env.APP_BASE_URL || "http://localhost:3000";
        const resp = await fetch(`${origin}/api/onchain/anchor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            batchVersionHash: hash,
          }),
        });

        anchorResult = await resp.json().catch(() => null);

        if (resp.ok && anchorResult?.ok) {
          anchored = true;
        } else {
          anchorResult = {
            ok: false,
            note: "anchor skipped / failed",
            raw: anchorResult,
          };
        }
      } catch (err: any) {
        anchorResult = {
          ok: false,
          error: "ANCHOR_CALL_FAILED",
          message: String(err?.message || err),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      batchId,
      status,
      auditorName,
      batchVersionId,
      batchVersionHash: hash,
      anchored,
      anchorResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AUDITOR_UPDATE_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || url.searchParams.get("id") || "";
  const status = url.searchParams.get("status") || "approved";
  const note = url.searchParams.get("note") || "";
  const auditorName =
    url.searchParams.get("auditorName") ||
    url.searchParams.get("by") ||
    "ESG Auditor";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId,
        status,
        note,
        auditorName,
      }),
    })
  );
}