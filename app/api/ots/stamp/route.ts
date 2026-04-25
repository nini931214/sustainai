// app/api/ots/stamp/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getOtsInfoResult } from "@/lib/ots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");
const OTS_DIR = path.join(DATA_DIR, "ots");

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

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeVidFromVersion(version: any) {
  const raw =
    String(version?.batchVersionId || "").trim() ||
    `hash:${String(version?.hash || "").slice(0, 16)}`;
  return raw.replace(/[^\w@.\-:]+/g, "_");
}

function resolveReportId(r: any) {
  return String(r?.id || r?.reportId || r?.report_id || "");
}

async function ensureFile(dirAbs: string, filename: string, content: string) {
  await fs.mkdir(dirAbs, { recursive: true });
  const abs = path.join(dirAbs, filename);
  await fs.writeFile(abs, content, "utf8");
  return abs;
}

/* ---------------- core ---------------- */

/**
 * ✅ 允許三種輸入方式：
 * A) batchId + batchVersionHash（最推薦，最精準）
 * B) reportId（自動從 reports.json 找 batchId + hash）
 * C) batchId + batchVersionId（備用）
 */
async function resolveTarget(params: {
  reportId?: string;
  batchId?: string;
  batchVersionHash?: string;
  batchVersionId?: string;
}) {
  const reportId = String(params.reportId || "").trim();
  let batchId = String(params.batchId || "").trim();
  let batchVersionHash = String(params.batchVersionHash || "").trim();
  let batchVersionId = String(params.batchVersionId || "").trim();

  if (!batchId || !batchVersionHash) {
    if (reportId) {
      const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });
      const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];
      const report = reports.find((r) => resolveReportId(r) === reportId) || null;
      if (report) {
        batchId = batchId || String(report?.batchId || report?.batch_id || "").trim();
        batchVersionHash = batchVersionHash || String(report?.batchVersionHash || report?.batchVersionHash || "").trim();
        batchVersionId = batchVersionId || String(report?.batchVersionId || "").trim();
      }
    }
  }

  const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
  const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

  let idx = -1;
  if (batchId && batchVersionHash) {
    idx = records.findIndex(
      (r) => String(r?.batchId) === batchId && String(r?.hash || "") === batchVersionHash
    );
  }

  if (idx < 0 && batchId && batchVersionId) {
    idx = records.findIndex(
      (r) => String(r?.batchId) === batchId && String(r?.batchVersionId || "") === batchVersionId
    );
  }

  if (idx < 0 && batchId) {
    // fallback: 同 batchId 最新
    const same = records
      .map((r, i) => ({ r, i }))
      .filter((x) => String(x.r?.batchId) === batchId)
      .sort((a, b) => Number(new Date(b.r?.ts || 0)) - Number(new Date(a.r?.ts || 0)));
    if (same[0]) idx = same[0].i;
  }

  return { records, idx, batchId, batchVersionHash, batchVersionId };
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const reportId = String(body?.reportId || "").trim();
    const batchIdHint = String(body?.batchId || "").trim();
    const batchVersionHashHint = String(body?.batchVersionHash || "").trim();
    const batchVersionIdHint = String(body?.batchVersionId || "").trim();

    const { records, idx, batchId, batchVersionHash } = await resolveTarget({
      reportId,
      batchId: batchIdHint,
      batchVersionHash: batchVersionHashHint,
      batchVersionId: batchVersionIdHint,
    });

    if (idx < 0 || !records[idx]) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_VERSION_NOT_FOUND",
          received: { reportId: reportId || null, batchId: batchIdHint || null, batchVersionHash: batchVersionHashHint || null },
          hint: "Pass (batchId + batchVersionHash) or pass reportId that exists in reports.json",
        },
        { status: 404 }
      );
    }

    const version = records[idx];
    const safeVid = safeVidFromVersion(version);

    // ✅ 1) 產 hash 檔（內容就是 version.hash）
    const dirAbs = path.join(OTS_DIR, String(version.batchId), safeVid);
    const hashFilename = `${safeVid}.hash`;
    const hashAbs = await ensureFile(dirAbs, hashFilename, String(version.hash || ""));

    // ✅ 2) 假設你的外部流程會在 `${hashAbs}.ots` 產生 receipt
    const otsAbs = `${hashAbs}.ots`;

    // ✅ 3) 讀取 OTS 狀態（complete/pending/missing/unknown 由你 lib/ots 決定）
    let info: any;
    try {
      await fs.access(otsAbs);
      info = await getOtsInfoResult(otsAbs);
    } catch {
      // receipt 還沒產生：先當 pending（但 hash 檔已生成）
      info = {
        status: "pending",
        verifyError: "OTS_NOT_YET_CREATED",
      };
    }

    const nowIso = new Date().toISOString();

    // ✅ 4) 回寫到 version.ots（讓 verify 直接顯示 receiptUrl/downloadUrl）
    const otsRelHash = path.relative(process.cwd(), hashAbs);
    const otsRelOts = path.relative(process.cwd(), otsAbs);

    version.ots = {
      status: info?.status || "pending",
      verifyError: info?.verifyError || null,
      ts: nowIso,
      hashPath: otsRelHash,
      otsPath: otsRelOts,

      // ✅ 這兩個是給 verify UI 直接用
      receiptUrl: `/api/ots/download?batchId=${encodeURIComponent(String(version.batchId))}&batchVersionHash=${encodeURIComponent(String(version.hash || ""))}`,
      downloadUrl: `/api/ots/download?batchId=${encodeURIComponent(String(version.batchId))}&batchVersionHash=${encodeURIComponent(String(version.hash || ""))}`,
    };

    // 可選：也放個 onChain 摘要（之後你要換真鏈）
    version.onChain = version.onChain || null;

    records[idx] = version;
    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      batchId: String(version.batchId),
      batchVersionHash: String(version.hash || ""),
      batchVersionId: String(version.batchVersionId || ""),
      wrote: {
        batch_versions: path.relative(process.cwd(), BATCH_VERSIONS_FILE),
        hashFile: otsRelHash,
        otsFile: otsRelOts,
      },
      ots: version.ots,
      info,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "OTS_STAMP_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}

/**
 * 方便你用瀏覽器打：
 * GET /api/ots/stamp?batchId=...&batchVersionHash=...
 * 或 GET /api/ots/stamp?reportId=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reportId = url.searchParams.get("reportId") || "";
  const batchId = url.searchParams.get("batchId") || "";
  const batchVersionHash = url.searchParams.get("batchVersionHash") || "";
  const batchVersionId = url.searchParams.get("batchVersionId") || "";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, batchId, batchVersionHash, batchVersionId }),
    })
  );
}