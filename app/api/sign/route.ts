// app/api/sign/route.ts
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
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

function getPrivKeyByRole(role: string) {
  // 你可以先用同一把 key demo，之後再拆三把
  // 建議：RECYCLER_PRIVATE_KEY_PEM / PROCESSOR_PRIVATE_KEY_PEM / AUDITOR_PRIVATE_KEY_PEM
  const map: Record<string, string | undefined> = {
    recycler: process.env.RECYCLER_PRIVATE_KEY_PEM,
    processor: process.env.PROCESSOR_PRIVATE_KEY_PEM,
    auditor: process.env.AUDITOR_PRIVATE_KEY_PEM,
  };
  const priv = map[role];
  if (!priv) throw new Error(`PRIVATE_KEY_MISSING_FOR_${role}`);
  return priv.replace(/\\n/g, "\n");
}

function signBase64(message: string, pem: string) {
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);
  return sig.toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const role = String(body?.role || "").trim(); // recycler | processor | auditor
    const hash = String(body?.hash || "").trim();

    if (!role || !hash) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", required: ["role", "hash"] },
        { status: 400 }
      );
    }

    const db = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];
    const idx = records.findIndex((r) => String(r?.hash) === hash);
    if (idx < 0) {
      return NextResponse.json({ ok: false, error: "VERSION_NOT_FOUND", hash }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const pem = getPrivKeyByRole(role);
    const sig = signBase64(hash, pem);

    const rec = records[idx];
    const signatures: any[] = Array.isArray(rec.signatures) ? rec.signatures : [];

    // 同角色重簽：覆蓋最新（或你也可以改成保留歷史）
    const filtered = signatures.filter((s) => String(s?.role) !== role);

    filtered.push({
      role,
      alg: "RSA-SHA256",
      kid: `${role}-v1`,
      sig,
      ts: nowIso,
    });

    rec.signatures = filtered;
    records[idx] = rec;

    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({ ok: true, hash, role, wrote: "data/batch_versions.json" });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SIGN_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}