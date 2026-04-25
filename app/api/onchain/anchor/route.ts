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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = String(body?.batchId || "").trim();
    const batchVersionHash = String(body?.batchVersionHash || body?.hash || "").trim();

    if (!batchId || !batchVersionHash) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", required: ["batchId", "batchVersionHash"] },
        { status: 400 }
      );
    }

    const txHash =
      "0x" +
      crypto
        .createHash("sha256")
        .update(`${batchId}|${batchVersionHash}|${Date.now()}`)
        .digest("hex");

    const onChain = {
      status: "mined",
      mode: "mock",
      chainId: 80002,
      network: "Polygon Amoy Mock",
      contract: "0xMOCK_CONTRACT",
      txHash,
      blockNumber: Math.floor(Date.now() / 1000),
      anchoredAt: new Date().toISOString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`,
    };

    const db = await readJson(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];

    const idx = records.findIndex(
      (r) => String(r?.batchId) === batchId && String(r?.hash) === batchVersionHash
    );

    if (idx >= 0) {
      records[idx].onChain = onChain;
      await writeJson(BATCH_VERSIONS_FILE, { records });
    }

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionHash,
      onChain,
      wroteBack: idx >= 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "ONCHAIN_ANCHOR_FAILED",
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

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, batchVersionHash }),
    })
  );
}