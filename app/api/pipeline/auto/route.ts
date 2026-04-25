import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

async function readJson(file: string, fallback: any) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function getLatestBatch(rows: any[]) {
  return [...rows].sort((a, b) => {
    const at = Number(new Date(a?.ts || a?.created_at || 0));
    const bt = Number(new Date(b?.ts || b?.created_at || 0));
    return bt - at;
  })[0];
}

function getLatestVersion(records: any[], batchId: string) {
  return [...records]
    .filter((r) => String(r?.batchId) === batchId)
    .sort((a, b) => Number(new Date(b?.ts || 0)) - Number(new Date(a?.ts || 0)))[0];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const chain = await readJson(CHAIN_FILE, []);
    const rows: any[] = Array.isArray(chain) ? chain : [];

    const batchId =
      String(body?.batchId || body?.id || "").trim() ||
      String(getLatestBatch(rows)?.id || "").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "NO_BATCH_FOUND" },
        { status: 400 }
      );
    }

    const origin = process.env.APP_BASE_URL || "http://localhost:3000";

    // 1. 自動稽核通過，會 append version
    const auditResp = await fetch(`${origin}/api/auditor/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId,
        status: "approved",
        by: "Auto Auditor",
        note: "系統自動審核通過並建立可信版本。",
      }),
    });

    const auditResult = await auditResp.json().catch(() => null);

    if (!auditResp.ok || !auditResult?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "AUTO_AUDIT_FAILED",
          batchId,
          auditResult,
        },
        { status: 400 }
      );
    }

    // 2. 取得最新 version hash
    const versionsDb = await readJson(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(versionsDb?.records)
      ? versionsDb.records
      : [];

    const latestVersion = getLatestVersion(records, batchId);

    if (!latestVersion?.hash) {
      return NextResponse.json(
        {
          ok: false,
          error: "LATEST_VERSION_NOT_FOUND",
          batchId,
        },
        { status: 400 }
      );
    }

    const batchVersionHash = String(latestVersion.hash);

    // 3. 自動 OTS stamp
    let otsResult: any = null;
    try {
      const otsResp = await fetch(`${origin}/api/ots/stamp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          batchVersionHash,
        }),
      });
      otsResult = await otsResp.json().catch(() => null);
    } catch (err: any) {
      otsResult = {
        ok: false,
        error: "OTS_AUTO_FAILED",
        message: String(err?.message || err),
      };
    }

    // 4. 自動 on-chain anchor
    let anchorResult: any = null;
    try {
      const anchorResp = await fetch(`${origin}/api/onchain/anchor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          batchVersionHash,
        }),
      });
      anchorResult = await anchorResp.json().catch(() => null);
    } catch (err: any) {
      anchorResult = {
        ok: false,
        error: "ANCHOR_AUTO_FAILED",
        message: String(err?.message || err),
      };
    }

    // 5. 找 reportId
    const reportsDb = await readJson(REPORTS_FILE, { reports: [] });
    const reports: any[] = Array.isArray(reportsDb?.reports)
      ? reportsDb.reports
      : [];

    const report =
      [...reports]
        .filter((r) => String(r?.batchId) === batchId)
        .sort(
          (a, b) =>
            Number(new Date(b?.audit_time_iso || b?.updated_at || 0)) -
            Number(new Date(a?.audit_time_iso || a?.updated_at || 0))
        )[0] || null;

    const reportId =
      String(report?.id || report?.reportId || `RPT-${batchId}`).trim();

    return NextResponse.json({
      ok: true,
      mode: "auto-pipeline",
      batchId,
      reportId,
      batchVersionHash,
      verifyUrl: `/verify?reportId=${encodeURIComponent(reportId)}`,
      auditResult,
      otsResult,
      anchorResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AUTO_PIPELINE_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || "";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId }),
    })
  );
}