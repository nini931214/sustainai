// app/api/auditor/mark/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");

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

/**
 * POST /api/auditor/mark
 * body: { batchId: string, status: 'approved'|'rejected'|'pending', by?: string, note?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || "").trim();
    const status = String(body?.status || "").trim(); // approved | rejected | pending
    const by = String(body?.by || "ESG Auditor").trim();
    const note = String(body?.note || "").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID", required: ["batchId"] },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_STATUS",
          allowed: ["approved", "rejected", "pending"],
        },
        { status: 400 }
      );
    }

    // 讀 chain.json
    const chainRows = await readJsonAny(CHAIN_FILE, []);
    const rows: any[] = Array.isArray(chainRows) ? chainRows : [];

    const idx = rows.findIndex((r) => String(r?.id) === batchId);
    if (idx < 0) {
      return NextResponse.json(
        { ok: false, error: "BATCH_NOT_FOUND", batchId, hint: "Check data/chain.json" },
        { status: 404 }
      );
    }

    // ✅ 這裡用 number(ms) 存 ts，因為你 UI formatTs 期待 number
    const ts = Date.now();

    const batch = rows[idx];
    batch.audit = {
      status,
      by,
      ts,
      ...(note ? { note } : {}),
    };

    rows[idx] = batch;
    await writeJsonPretty(CHAIN_FILE, rows);

    return NextResponse.json({
      ok: true,
      batchId,
      audit: batch.audit,
      wrote: path.relative(process.cwd(), CHAIN_FILE),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AUDITOR_MARK_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}

/**
 * 方便你用瀏覽器直接打：
 * GET /api/auditor/mark?batchId=BATCH-2025-003&status=rejected&by=ESG%20Auditor&note=缺少文件
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || "";
  const status = url.searchParams.get("status") || "";
  const by = url.searchParams.get("by") || "ESG Auditor";
  const note = url.searchParams.get("note") || "";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, status, by, note }),
    })
  );
}