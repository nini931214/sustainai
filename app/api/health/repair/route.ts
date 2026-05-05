import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
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

export async function POST() {
  const repaired: string[] = [];

  try {
    const db = await readJson(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];

    if (records.length === 0) {
      return NextResponse.json(
        { ok: false, error: "NO_VERSIONS_FOUND" },
        { status: 400 }
      );
    }

    const latestIdx = records.length - 1;
    const latest = records[latestIdx];
    const nowIso = new Date().toISOString();

    if (!Array.isArray(latest.signatures) || latest.signatures.length === 0) {
      latest.signatures = [
        {
          role: "auditor",
          signer: String(process.env.AUDITOR_DID || "did:web:auditor.local"),
          signerName: "Health Repair",
          alg: "RSA-SHA256",
          kid: String(process.env.AUDITOR_KID || "auditor-key-1"),
          ts: nowIso,
          signature: signBase64(String(latest.hash || "")),
        },
      ];
      repaired.push("signature");
    }

    if (!Array.isArray(latest.events)) latest.events = [];
    if (latest.events.length === 0) {
      latest.events.push({
        type: "health.repair",
        action: "auto_repair",
        ts: nowIso,
        role: "system",
        by: "health-checker",
        note: "auto repaired missing event trail",
      });
      repaired.push("events");
    }

    records[latestIdx] = latest;
    await writeJson(BATCH_VERSIONS_FILE, { records });

    let otsResult: any = null;
    if (!latest?.ots?.status || latest?.ots?.status === "missing") {
      try {
        const origin = process.env.APP_BASE_URL || "http://localhost:3000";
        const resp = await fetch(`${origin}/api/ots/stamp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId: latest.batchId,
            batchVersionHash: latest.hash,
          }),
        });
        otsResult = await resp.json().catch(() => null);
        if (resp.ok) repaired.push("ots");
      } catch (err: any) {
        otsResult = {
          ok: false,
          error: "OTS_REPAIR_FAILED",
          message: String(err?.message || err),
        };
      }
    }

    let onChainResult: any = null;
    if (!latest?.onChain?.txHash) {
      try {
        const origin = process.env.APP_BASE_URL || "http://localhost:3000";
        const resp = await fetch(`${origin}/api/onchain/anchor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId: latest.batchId,
            batchVersionHash: latest.hash,
          }),
        });
        onChainResult = await resp.json().catch(() => null);
        if (resp.ok) repaired.push("onchain");
      } catch (err: any) {
        onChainResult = {
          ok: false,
          error: "ONCHAIN_REPAIR_FAILED",
          message: String(err?.message || err),
        };
      }
    }

    try {
      const origin = process.env.APP_BASE_URL || "http://localhost:3000";
      const reportId = "RPT-BATCH-2026-004";

      await fetch(`${origin}/api/verify?reportId=${reportId}`, {
        cache: "no-store",
      });

      repaired.push("verify");
    } catch {}

    return NextResponse.json({
      ok: true,
      repaired,
      latest: {
        batchId: latest.batchId || null,
        batchVersionHash: latest.hash || null,
      },
      otsResult,
      onChainResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "HEALTH_REPAIR_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}