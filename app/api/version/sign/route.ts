// app/api/version/sign/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

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

function signBase64(message: string, role: string) {
  const envKey =
    role === "auditor"
      ? "AUDITOR_PRIVATE_KEY_PEM"
      : role === "recycler"
      ? "RECYCLER_PRIVATE_KEY_PEM"
      : role === "processor"
      ? "PROCESSOR_PRIVATE_KEY_PEM"
      : "";

  const priv = (envKey ? readPemFromEnv(envKey) : "") || readPemFromEnv("PRIVATE_KEY_PEM");
  if (!priv) throw new Error("PRIVATE_KEY_MISSING");

  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), priv);
  return sig.toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = String(body?.batchId || body?.id || "").trim();
    const role = String(body?.role || "").trim(); // recycler / processor / auditor
    const did = String(body?.did || `did:web:${role}.local`).trim();
    const signerName = String(body?.signerName || body?.name || role).trim();
    const batchVersionHashHint = String(body?.batchVersionHash || "").trim();

    if (!batchId || !role) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", required: ["batchId", "role"] },
        { status: 400 }
      );
    }

    const db = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];

    // 找目標版本：hash 指定優先，否則取最新
    let targetIdx = -1;

    if (batchVersionHashHint) {
      targetIdx = records.findIndex(
        (r) => String(r?.batchId) === batchId && String(r?.hash || "") === batchVersionHashHint
      );
    } else {
      const same = records
        .map((r, i) => ({ r, i }))
        .filter((x) => String(x.r?.batchId) === batchId)
        .sort((a, b) => Number(new Date(b.r?.ts || 0)) - Number(new Date(a.r?.ts || 0)));
      if (same[0]) targetIdx = same[0].i;
    }

    if (targetIdx < 0) {
      return NextResponse.json(
        { ok: false, error: "BATCH_VERSION_NOT_FOUND", batchId, batchVersionHash: batchVersionHashHint || null },
        { status: 404 }
      );
    }

    const v = records[targetIdx];
    const hash = String(v?.hash || "");
    if (!hash) {
      return NextResponse.json({ ok: false, error: "VERSION_HASH_MISSING" }, { status: 500 });
    }

    const sig = signBase64(hash, role);
    const nowIso = new Date().toISOString();

    const signatures = Array.isArray(v?.signatures) ? v.signatures : [];

    // 同 role + did 已存在就覆寫，否則 append
    const exists = signatures.findIndex((s: any) => String(s?.role) === role && String(s?.did) === did);

    const row = {
      role,
      did,
      signerName,
      signature: sig,
      alg: "RSA-SHA256",
      signedAt: nowIso,
    };

    if (exists >= 0) signatures[exists] = row;
    else signatures.push(row);

    v.signatures = signatures;
    records[targetIdx] = v;

    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      batchId,
      role,
      did,
      batchVersionId: v.batchVersionId || null,
      batchVersionHash: v.hash,
      signaturesCount: signatures.length,
      wrote: { batch_versions: path.relative(process.cwd(), BATCH_VERSIONS_FILE) },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "VERSION_SIGN_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}