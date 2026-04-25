import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");

async function readJson(file: string, fallback: any) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function getLatestByTs(items: any[]) {
  return [...items].sort((a, b) => {
    const at = Number(new Date(a?.ts || a?.audit_time_iso || a?.updated_at || 0));
    const bt = Number(new Date(b?.ts || b?.audit_time_iso || b?.updated_at || 0));
    return bt - at;
  })[0];
}

export async function GET() {
  try {
    const versionsDb = await readJson(BATCH_VERSIONS_FILE, { records: [] });
    const reportsDb = await readJson(REPORTS_FILE, { reports: [] });

    const records: any[] = Array.isArray(versionsDb?.records)
      ? versionsDb.records
      : [];

    const reports: any[] = Array.isArray(reportsDb?.reports)
      ? reportsDb.reports
      : [];

    const latestVersion = getLatestByTs(records) || null;
    const latestReport = getLatestByTs(reports) || null;

    const sampleReportId =
      latestReport?.id ||
      latestReport?.reportId ||
      latestReport?.report_id ||
      "";

    let verifyApi = false;

    if (sampleReportId) {
      try {
        const origin = process.env.APP_BASE_URL || "http://localhost:3000";

        const resp = await fetch(
          `${origin}/api/verify?reportId=${encodeURIComponent(sampleReportId)}`,
          { cache: "no-store" }
        );

        verifyApi = resp.status !== 404;
      } catch {
        verifyApi = false;
      }
    }

    const latestIdx = records.findIndex(
      (r) => String(r?.hash || "") === String(latestVersion?.hash || "")
    );

    const prevVersion = latestIdx > 0 ? records[latestIdx - 1] : null;

    const appendOnly =
      records.length <= 1
        ? "unknown"
        : latestVersion?.prevHash === prevVersion?.hash;

    const sigs = Array.isArray(latestVersion?.signatures)
      ? latestVersion.signatures
      : [];

    const results = {
      versionsExist: records.length > 0,
      appendOnly,
      verifyApi,
      signatureCount: sigs.length,
      hasAuditor: sigs.some((s: any) => String(s?.role) === "auditor"),
      otsStatus: latestVersion?.ots?.status || "missing",
      onchain: latestVersion?.onChain?.txHash ? "anchored" : "notAnchored",
      hasEvents:
        Array.isArray(latestVersion?.events) &&
        latestVersion.events.length > 0,
      sampleReportId,
      sampleBatchId: latestVersion?.batchId || latestReport?.batchId || null,
    };

    const ok =
      results.versionsExist &&
      results.verifyApi &&
      results.signatureCount >= 1 &&
      results.hasEvents &&
      results.onchain === "anchored";

    return NextResponse.json({
      ok,
      results,
      summary: {
        versions: results.versionsExist ? "ok" : "missing",
        appendOnly: results.appendOnly,
        verify: results.verifyApi ? "ok" : "fail",
        signatures: results.signatureCount,
        ots: results.otsStatus,
        onchain: results.onchain,
        events: results.hasEvents ? "ok" : "missing",
        sampleReportId,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "CHECKLIST_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}