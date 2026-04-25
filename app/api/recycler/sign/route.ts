// app/api/recycler/sign/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

/* ---------------- utils ---------------- */

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonPretty(filePath: string, data: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function readPemFromEnv(key: string) {
  const v = process.env[key];
  if (!v) return "";
  return v.replace(/\\n/g, "\n");
}

/** RSA sign(message) -> base64 */
function signBase64WithKey(message: string, privPem: string) {
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), privPem);
  return sig.toString("base64");
}

function buildSignEvent(params: {
  role: "recycler";
  by: string;
  note: string;
  tsIso: string;
  kid: string;
}) {
  return {
    type: "role.sign",
    action: "sign",
    ts: params.tsIso,
    role: params.role,
    by: params.by,
    note: params.note,
    data: { kid: params.kid },
  };
}

/* ---------------- API ---------------- */
/**
 * POST /api/recycler/sign
 * body: { batchId: string, signerName?: string, note?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = String(body?.batchId || body?.id || "").trim();
    const signerName = String(body?.signerName || body?.by || "Recycler").trim();
    const note = String(body?.note || "recycler signed").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID", required: ["batchId"] },
        { status: 400 }
      );
    }

    const priv =
      readPemFromEnv("RECYCLER_PRIVATE_KEY_PEM") ||
      readPemFromEnv("PRIVATE_KEY_PEM"); // fallback（demo）

    if (!priv) {
      return NextResponse.json(
        { ok: false, error: "PRIVATE_KEY_MISSING", hint: "Set RECYCLER_PRIVATE_KEY_PEM" },
        { status: 500 }
      );
    }

    const db = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];

    const idxs = records
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => String(r?.batchId) === batchId)
      .sort((a, b) => Number(new Date(b.r?.ts || 0)) - Number(new Date(a.r?.ts || 0)));

    const latest = idxs[0];
    if (!latest) {
      return NextResponse.json(
        { ok: false, error: "VERSION_NOT_FOUND", batchId, hint: "No records in batch_versions.json" },
        { status: 404 }
      );
    }

    const i = latest.i;
    const v = records[i];
    const hash = String(v?.hash || "").trim();
    if (!hash) {
      return NextResponse.json(
        { ok: false, error: "MISSING_VERSION_HASH", batchId },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    const kid = String(process.env.RECYCLER_KID || "recycler-key-1");
    const did = String(process.env.RECYCLER_DID || "did:web:recycler.local");

    const signature = signBase64WithKey(hash, priv);

    const sigObj = {
      role: "recycler",
      did,
      signerName,
      signature,
      alg: "RSA-SHA256",
      kid,
      signedAt: nowIso,
    };

    const signatures: any[] = Array.isArray(v?.signatures) ? [...v.signatures] : [];
    // 更新自己的 role（不動 auditor / processor）
    const nextSignatures = signatures.filter((s) => String(s?.role || "") !== "recycler");
    nextSignatures.push(sigObj);

    const events: any[] = Array.isArray(v?.events) ? [...v.events] : [];
    events.push(buildSignEvent({ role: "recycler", by: signerName, note, tsIso: nowIso, kid }));

    records[i] = {
      ...v,
      signatures: nextSignatures,
      events,
      // 相容：也同步一份 event（單筆）方便 debug
      event: events[events.length - 1],
    };

    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId: String(v?.batchVersionId || ""),
      batchVersionHash: hash,
      wrote: path.relative(process.cwd(), BATCH_VERSIONS_FILE),
      signer: { role: "recycler", signerName, did, kid, signedAt: nowIso },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "RECYCLER_SIGN_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recycler/sign?batchId=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || "";
  const signerName = url.searchParams.get("signerName") || "Recycler";
  const note = url.searchParams.get("note") || "recycler signed";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, signerName, note }),
    })
  );
}