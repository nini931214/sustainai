// app/api/report/submit/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_PATH = path.join(DATA_DIR, "chain.json");
const REPORTS_PATH = path.join(DATA_DIR, "reports.json");

/** --- stable stringify（確保 hash 可重現）--- */
function stableStringify(input: any): string {
  const seen = new WeakSet();

  const sorter = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;

    if (seen.has(value)) {
      // 避免循環引用炸掉
      return "[Circular]";
    }
    seen.add(value);

    if (Array.isArray(value)) return value.map(sorter);

    const keys = Object.keys(value).sort();
    const out: any = {};
    for (const k of keys) out[k] = sorter(value[k]);
    return out;
  };

  return JSON.stringify(sorter(input));
}

function sha256Hex(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // chain.json 若不存在就補空陣列
  try {
    await fs.access(CHAIN_PATH);
  } catch {
    await fs.writeFile(CHAIN_PATH, "[]", "utf8");
  }
  // reports.json 若不存在就補 { reports: [] }
  try {
    await fs.access(REPORTS_PATH);
  } catch {
    await fs.writeFile(REPORTS_PATH, JSON.stringify({ reports: [] }, null, 2), "utf8");
  }
}

async function readJsonSafe(p: string, fallback: any) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return raw?.trim() ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function readChainRows(): Promise<any[]> {
  await ensureStore();
  const rows = await readJsonSafe(CHAIN_PATH, []);
  return Array.isArray(rows) ? rows : [];
}

type ReportsStore = { reports: any[] };

async function readReportsStore(): Promise<ReportsStore> {
  await ensureStore();
  const store = await readJsonSafe(REPORTS_PATH, { reports: [] });
  return store && Array.isArray(store.reports) ? store : { reports: [] };
}

async function writeReportsStore(store: ReportsStore) {
  await ensureStore();
  await fs.writeFile(REPORTS_PATH, JSON.stringify(store, null, 2), "utf8");
}

/** 用 chain.json 的批次資料推 batchVersionId（最不破壞你的資料結構） */
function deriveBatchVersionId(batch: any): string {
  const batchId = String(batch?.id || "BATCH-UNKNOWN");
  const ts =
    batch?.audit?.ts ??
    batch?.ts ??
    batch?.created_at ??
    Date.now();

  return `${batchId}@ts:${ts}`;
}

/**
 * POST body（最少需求）：
 * {
 *   "batchId": "BATCH-2026-002",
 *   "report_payload": { ... }   // 你要放進報告的 payload
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = String(body.batchId || "").trim();
    const reportPayload = body.report_payload ?? body.reportPayload;

    if (!batchId) {
      return NextResponse.json({ ok: false, error: "MISSING_BATCH_ID" }, { status: 400 });
    }
    if (!reportPayload || typeof reportPayload !== "object") {
      return NextResponse.json({ ok: false, error: "MISSING_REPORT_PAYLOAD" }, { status: 400 });
    }

    const chain = await readChainRows();
    const batch = chain.find((b: any) => String(b?.id) === batchId);

    if (!batch) {
      return NextResponse.json({ ok: false, error: "BATCH_NOT_FOUND", batchId }, { status: 404 });
    }

    const batchVersionId = deriveBatchVersionId(batch);

    // ✅ (2) 真正算出 report_payload_hash
    const report_payload_hash = sha256Hex(stableStringify(reportPayload));

    // reportId：若你有自己的規則可以替換；這裡用時間戳最不會撞
    const reportId = String(body.reportId || "").trim() || `RPT-${Date.now()}`;

    const store = await readReportsStore();
    const next = {
      id: reportId,
      batchId,
      batchVersionId,               // ✅ (3) 綁定版本
      report_payload: reportPayload,
      report_payload_hash,          // ✅ (2) 不再 PLACEHOLDER
      created_at: new Date().toISOString(),
    };

    // 同 id 覆蓋，沒有就 push
    const idx = store.reports.findIndex((r: any) => String(r?.id) === reportId);
    if (idx >= 0) store.reports[idx] = next;
    else store.reports.unshift(next);

    await writeReportsStore(store);

    return NextResponse.json({ ok: true, report: next });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "REPORT_SUBMIT_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}