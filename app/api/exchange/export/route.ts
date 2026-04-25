import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function resolveReportId(r: any) {
  return String(r?.id || r?.reportId || r?.report_id || "");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = (url.searchParams.get("reportId") || "").trim();

    if (!reportId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_REPORT_ID" },
        { status: 400 }
      );
    }

    const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const chainDb = await readJsonAny(CHAIN_FILE, []);

    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];
    const versions: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];
    const chain: any[] = Array.isArray(chainDb) ? chainDb : [];

    const report = reports.find((r) => resolveReportId(r) === reportId);
    if (!report) {
      return NextResponse.json(
        { ok: false, error: "REPORT_NOT_FOUND", reportId },
        { status: 404 }
      );
    }

    const batchId = String(report?.batchId || "").trim();
    const batchVersionHash = String(report?.batchVersionHash || report?.batchVersionHash || "").trim();
    const batchVersionId = String(report?.batchVersionId || "").trim();

    const batch = chain.find((r) => String(r?.id) === batchId) || null;

    let version =
      versions.find(
        (v) =>
          String(v?.batchId) === batchId &&
          String(v?.hash || "") === batchVersionHash
      ) || null;

    if (!version && batchVersionId) {
      version =
        versions.find(
          (v) =>
            String(v?.batchId) === batchId &&
            String(v?.batchVersionId || "") === batchVersionId
        ) || null;
    }

    if (!version) {
      return NextResponse.json(
        { ok: false, error: "BATCH_VERSION_NOT_FOUND", batchId, reportId },
        { status: 404 }
      );
    }

    const bundle = {
      schema: "proof-bundle/v1",
      exportedAt: new Date().toISOString(),
      reportId,
      batchId,
      batch,
      report,
      version,
    };

    return NextResponse.json({
      ok: true,
      bundle,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXCHANGE_EXPORT_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}