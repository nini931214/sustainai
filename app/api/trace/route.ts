import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "data", "tokens.json");

// 定義 Token 結構
type Token = {
  tokenId: string;
  batchId: string;
  material: string;
  weightKg: number;
  recycler: string;
  status: "minted" | "processed" | "used";
  issuedAt: string;
};

// === POST：模擬回收站「上鏈」 ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, actorName, data } = body;

    if (!batchId || !actorName || !data?.material || !data?.weightKg) {
      return NextResponse.json(
        { ok: false, error: "Missing batchId, actorName, or data fields" },
        { status: 400 }
      );
    }

    // 讀取現有資料
    const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
    const tokens: Token[] = JSON.parse(raw || "[]");

    // 建立新 Token
    const tokenId = `T-${Date.now()}`;
    const newToken: Token = {
      tokenId,
      batchId,
      material: data.material,
      weightKg: data.weightKg,
      recycler: actorName,
      status: "minted",
      issuedAt: new Date().toISOString(),
    };

    tokens.push(newToken);
    await fs.writeFile(DATA_PATH, JSON.stringify(tokens, null, 2), "utf8");

    return NextResponse.json({ ok: true, tokenId });
  } catch (e: any) {
    console.error("[POST /api/trace] Error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// === GET：查看目前的 Tokens ===
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const batchId = searchParams.get("batchId");

  const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
  const tokens: Token[] = JSON.parse(raw || "[]");
  const filtered = batchId ? tokens.filter((t) => t.batchId === batchId) : tokens;

  return NextResponse.json({ ok: true, items: filtered });
}