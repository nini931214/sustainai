import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { signVc } from "../../../../lib/vc";
import { buildEmbeddedVc } from "../../../../lib/vc";

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

function roleKey(role: string) {
  const r = String(role || "").toLowerCase();
  if (r === "auditor") {
    return {
      priv: "AUDITOR_PRIVATE_KEY_PEM",
      pub: "AUDITOR_PUBLIC_KEY_PEM",
      did: "did:web:auditor.local",
      kid: "key-1",
    };
  }
  if (r === "recycler") {
    return {
      priv: "RECYCLER_PRIVATE_KEY_PEM",
      pub: "RECYCLER_PUBLIC_KEY_PEM",
      did: "did:web:recycler.local",
      kid: "key-1",
    };
  }
  return {
    priv: "PROCESSOR_PRIVATE_KEY_PEM",
    pub: "PROCESSOR_PUBLIC_KEY_PEM",
    did: "did:web:processor.local",
    kid: "key-1",
  };
}

function signBase64(message: string, privPem: string) {
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), privPem);
  return sig.toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || "").trim();
    const batchVersionHash = String(body?.batchVersionHash || "").trim();
    const role = String(body?.role || "").trim().toLowerCase();
    const by = String(body?.by || role || "signer").trim();
    const note = String(body?.note || "").trim();

    if (!batchId || !batchVersionHash || !role) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_PARAMS",
          required: ["batchId", "batchVersionHash", "role"],
        },
        { status: 400 }
      );
    }

    const db = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];

    const idx = records.findIndex(
      (r) =>
        String(r?.batchId) === batchId &&
        String(r?.hash || "") === batchVersionHash
    );

    if (idx < 0) {
      return NextResponse.json(
        { ok: false, error: "BATCH_VERSION_NOT_FOUND", batchId, batchVersionHash },
        { status: 404 }
      );
    }

    const v = records[idx];
    const hash = String(v?.hash || "");
    const nowIso = new Date().toISOString();

    const keys = roleKey(role);
    const priv =
      readPemFromEnv(keys.priv) ||
      readPemFromEnv("PRIVATE_KEY_PEM");

    if (!priv) {
      return NextResponse.json(
        { ok: false, error: "PRIVATE_KEY_MISSING", env: keys.priv },
        { status: 500 }
      );
    }

    const signature = signBase64(hash, priv);

    const vc = buildEmbeddedVc({
      issuerDid: keys.did,
      role,
      batchId,
      batchVersionHash: hash,
      signerName: by,
      note,
      issuanceDate: nowIso,
      signature,
      kid: keys.kid,
    });

    const signatures = Array.isArray(v?.signatures) ? [...v.signatures] : [];
    const filtered = signatures.filter((s) => String(s?.role || "") !== role);

    filtered.push({
      role,
      signer: keys.did,
      signerName: by,
      alg: "RSA-SHA256",
      kid: keys.kid,
      ts: nowIso,
      signature,
      vc,
    });

    const events = Array.isArray(v?.events) ? [...v.events] : [];
    events.push({
      type: "admin.sign",
      ts: nowIso,
      role,
      by,
      note: note || `signed by ${role}`,
      data: {
        batchId,
        batchVersionHash: hash,
        did: keys.did,
        vcHash: vc.vcHash,
      },
    });

    records[idx] = {
      ...v,
      signatures: filtered,
      events,
    };

    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionHash: hash,
      role,
      did: keys.did,
      vcHash: vc.vcHash,
      wrote: {
        batch_versions: path.relative(process.cwd(), BATCH_VERSIONS_FILE),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "ROLE_SIGN_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || "";
  const batchVersionHash = url.searchParams.get("batchVersionHash") || "";
  const role = url.searchParams.get("role") || "auditor";
  const by = url.searchParams.get("by") || role;
  const note = url.searchParams.get("note") || "";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, batchVersionHash, role, by, note }),
    })
  );
}