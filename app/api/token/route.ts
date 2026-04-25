import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const TOKEN_PATH = path.join(process.cwd(), "data", "tokens.json");
const LEDGER_PATH = path.join(process.cwd(), "data", "ledger.json");

// ✅ 一律用安全解析 URL 的 helper
function getSearchParams(req: NextRequest) {
  try {
    return new URL(req.url, "http://localhost").searchParams;
  } catch {
    // fallback：確保不拋錯
    return new URL("http://localhost").searchParams;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = getSearchParams(req);
  const batchId = searchParams.get("batchId");
  const raw = await fs.readFile(TOKEN_PATH, "utf8").catch(() => "[]");
  const tokens = JSON.parse(raw || "[]");
  const filtered = batchId ? tokens.filter((t: any) => t.batchId === batchId) : tokens;
  return NextResponse.json({ items: filtered });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      tokenId,
      actorName,
      meta,
      autoUse,
      manufacturerName,
      useMeta,
    } = body;

    if (!tokenId || !actorName)
      return NextResponse.json(
        { error: "Missing tokenId or actorName" },
        { status: 400 }
      );

    // 讀取 tokens.json
    const raw = await fs.readFile(TOKEN_PATH, "utf8").catch(() => "[]");
    const tokens = JSON.parse(raw || "[]");
    const idx = tokens.findIndex((t: any) => t.tokenId === tokenId);
    if (idx === -1)
      return NextResponse.json({ error: "Token not found" }, { status: 404 });

    const token = tokens[idx];

    // === Process ===
    if (action === "process") {
      token.status = "processed";
      token.processor = actorName;
      token.processedAt = new Date().toISOString();
      token.yieldRate = meta?.yieldRate ?? 1;
      token.energyKwh = meta?.energyKwh ?? 0;
    }

    // === Auto-Use / Use ===
    if (autoUse || action === "use") {
      token.status = "used";
      token.manufacturer = manufacturerName || actorName;
      token.usedAt = new Date().toISOString();
      token.sku = useMeta?.sku ?? "N/A";
      token.lot = useMeta?.lot ?? "N/A";
    }

    // 寫回 tokens.json
    tokens[idx] = token;
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");

    // === 模擬結算 ledger ===
    const rawLedger = await fs.readFile(LEDGER_PATH, "utf8").catch(() => "{}");
    const ledger = JSON.parse(rawLedger || "{}");

    ledger[token.recycler || "Recycler"] =
      (ledger[token.recycler || "Recycler"] || 0) + 60;
    ledger[token.processor || "Processor"] =
      (ledger[token.processor || "Processor"] || 0) + 60;
    ledger[token.manufacturer || "Manufacturer"] =
      (ledger[token.manufacturer || "Manufacturer"] || 0) - 120;

    await fs.writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf8");

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    console.error("[POST /api/token] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}