import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

type Token = {
  tokenId: string;
  batchId: string;
  material?: string;
  weightKg?: number;
  recycler?: string;
  status?: "minted" | "processed" | "used";
  issuedAt?: string;
};

type BatchCore = {
  id: string;
  material?: string;
  kg?: number;
  recycler?: any;
  processor?: any;
  manufacturer?: any;
  audit?: { status?: string };
};

type TraceLike = {
  batch?: BatchCore;
  record?: any;
  footprint?: any;
  events?: any[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const TOKENS_PATH = path.join(DATA_DIR, "tokens.json");

/** 安全讀 JSON：檔案不存在就回 null */
async function readJsonSafe<T>(p: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 嘗試從多個可能來源抓「批次核心資料」 */
async function resolveBatchCore(batchId: string): Promise<BatchCore | null> {
  // 1) 你如果之後要正式化：可以把批次主資料放這裡（未來擴充最乾淨）
  // data/batches.json: [{ id, material, kg, ... }]
  const batches = await readJsonSafe<any[]>(path.join(DATA_DIR, "batches.json"));
  const hit = batches?.find((b) => b?.id === batchId);
  if (hit?.id) return hit as BatchCore;

  // 2) 如果你本來有 trace 的儲存（名稱不一定），這裡做「多檔案容錯」
  // 你可以把你專案目前真正在用的資料檔加進來（先用容錯不會壞）
  const candidates = [
    "trace.json",
    "traces.json",
    "records.json",
    "history.json",
    "batches-data.json",
  ];

  for (const name of candidates) {
    const obj = await readJsonSafe<Record<string, TraceLike> | TraceLike[]>(
      path.join(DATA_DIR, name)
    );

    if (!obj) continue;

    // case A: { [batchId]: { batch, record, ... } }
    if (!Array.isArray(obj)) {
      const item = (obj as any)[batchId] as TraceLike | undefined;
      const core =
        item?.batch ??
        item?.record?.batch ??
        item?.record ??
        null;
      if (core?.id) return core as BatchCore;
    }

    // case B: [{ batch:{id...} }, ...]
    if (Array.isArray(obj)) {
      const found = (obj as any[]).find((x) => x?.batch?.id === batchId || x?.id === batchId);
      const core =
        found?.batch ??
        found?.record?.batch ??
        found?.record ??
        (found?.id ? found : null);
      if (core?.id) return core as BatchCore;
    }
  }

  // 3) 最後保底：從 tokens.json 推一份最小 batch（至少讓 QR 頁不會「找不到」）
  const tokens = (await readJsonSafe<Token[]>(TOKENS_PATH)) ?? [];
  const t = tokens.find((x) => x.batchId === batchId);
  if (t) {
    return {
      id: batchId,
      material: t.material,
      kg: typeof t.weightKg === "number" ? t.weightKg : undefined,
      recycler: t.recycler,
    };
  }

  return null;
}

export async function GET(_req: NextRequest, ctx: { params: { batchId: string } }) {
  const id = decodeURIComponent(ctx.params.batchId);

  // tokens（如果你要在履歷頁顯示 mint/process/use 狀態很有用）
  const tokens = (await readJsonSafe<Token[]>(TOKENS_PATH)) ?? [];
  const tokenItems = tokens.filter((t) => t.batchId === id);

  // batch core
  const batch = await resolveBatchCore(id);

  return NextResponse.json({
    ok: true,
    batchId: id,
    batch: batch ?? null,
    tokens: tokenItems,
    // 之後你要整合 events / footprint，也可以加在這裡統一回傳
  });
}