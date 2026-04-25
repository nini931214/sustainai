// app/api/admin/backfill-verify/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
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

function stableJson(obj: any) {
  const sortKeys = (x: any): any => {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === "object") {
      return Object.keys(x)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = sortKeys(x[k]);
          return acc;
        }, {});
    }
    return x;
  };
  return JSON.stringify(sortKeys(obj));
}

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Demo 版本：先把報告 payload 固定成「批次摘要」即可
 *（正式版你可以改成 getBatchSummary(batch) 產生的 payload）
 */
function makeReportPayloadFromBatch(batch: any) {
  return {
    batchId: String(batch?.id || ""),
    material: batch?.material ?? null,
    kg: batch?.kg ?? null,
    recycler: batch?.recycler ?? null,
    processor: batch?.processor ?? null,
    manufacturer: batch?.manufacturer ?? null,
    transport: batch?.transport ?? null,
    audit: batch?.audit ?? null,
    ts: batch?.ts ?? batch?.created_at ?? null,
  };
}

function makeReportId(batchId: string) {
  // 你也可以換成你想要的格式
  // 例如：RPT-2025-001 對應 BATCH-2025-001
  return `RPT-${batchId.replace(/^BATCH-/, "")}`;
}

function makeBatchVersionId(batchId: string) {
  // demo 版本：用 batchId + 當下時間當 versionId
  return `${batchId}-V1`;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "approved-only").trim();
    // mode:
    // - approved-only：只補 audit.status === "approved"
    // - all：全部都補（不推薦）

    const chain: any[] = await readJsonAny(CHAIN_FILE, []);
    const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });

    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];
    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

    const updated: Array<{ batchId: string; reportId: string; batchVersionId: string; batchVersionHash: string }> = [];
    const skipped: Array<{ batchId: string; reason: string }> = [];

    for (let i = 0; i < chain.length; i++) {
      const b = chain[i];
      const batchId = String(b?.id || "").trim();
      if (!batchId) continue;

      const status = String(b?.audit?.status || "").toLowerCase();
      if (mode !== "all" && status !== "approved") {
        skipped.push({ batchId, reason: `audit.status=${status || "missing"}` });
        continue;
      }

      // 已經有 reportId + batchVersionHash 的就跳過
      if (b?.reportId && b?.batchVersionHash && b?.batchVersionId) {
        skipped.push({ batchId, reason: "already has reportId/batchVersionId/batchVersionHash" });
        continue;
      }

      const reportId = b?.reportId ? String(b.reportId) : makeReportId(batchId);
      const batchVersionId = b?.batchVersionId ? String(b.batchVersionId) : makeBatchVersionId(batchId);

      // 1) reports.json：用 reportId 當 key
      let report = reports.find((r) => String(r?.id || r?.reportId || "") === reportId) || null;
      if (!report) {
        const reportPayload = makeReportPayloadFromBatch(b);
        const reportPayloadHash = sha256Hex(stableJson(reportPayload));

        report = {
          id: reportId,
          report_payload: reportPayload,
          report_payload_hash: reportPayloadHash,
          audit_time_iso: nowIso(),
          time_source: "backfill",
        };
        reports.push(report);
      }

      const reportPayload =
        report?.report_payload ?? report?.reportPayload ?? report?.payload ?? null;
      const recomputedReportPayloadHash = sha256Hex(stableJson(reportPayload));

      // 2) batch_versions.json：用 batchId + batchVersionId 做一筆，hash 做 lookup key
      // demo hash：用 batch + report hash + batchVersionId 組合，確保每批次不同
      const versionMessage = `${batchId}|${batchVersionId}|${recomputedReportPayloadHash}`;
      const batchVersionHash = sha256Hex(versionMessage);

      let ver =
        records.find(
          (r) => String(r?.batchId) === batchId && String(r?.batchVersionId) === batchVersionId
        ) || null;

      if (!ver) {
        ver = {
          batchId,
          batchVersionId,
          hash: batchVersionHash,
          payloadHash: recomputedReportPayloadHash,
          ts: Date.now(),
          // signature/ots：demo 可以先留空，Verify 會顯示 WARN/FAIL
          signature: "",
          signer: "backfill",
          signerName: "Backfill Script",
          alg: "RSA-SHA256",
          ots: null,
        };
        records.push(ver);
      }

      // 3) 回寫到 chain.json 批次本體（讓 Trace / PDF 有東西可帶去 verify）
      chain[i] = {
        ...b,
        reportId,
        batchVersionId,
        batchVersionHash,
        reportPayloadHash: recomputedReportPayloadHash,
      };

      updated.push({ batchId, reportId, batchVersionId, batchVersionHash });
    }

    await writeJsonPretty(CHAIN_FILE, chain);
    await writeJsonPretty(REPORTS_FILE, { reports });
    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      mode,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      updated,
      skipped: skipped.slice(0, 20),
      hint:
        "updated 之後，你可以直接用 /verify?reportId=...&batchId=...&batchVersionHash=... 驗證；或從 PDF QR 進入。",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "BACKFILL_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}