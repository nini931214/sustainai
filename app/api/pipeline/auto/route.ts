// app/api/auto-pipeline/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getLatestBatchId() {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("id, ts, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data?.id ? String(data.id) : "";
}

async function getLatestVersion(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from("batch_versions")
    .select("*")
    .eq("batch_id", batchId)
    .order("ts", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function getLatestReport(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("batch_id", batchId)
    .order("audit_time_iso", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId =
      String(body?.batchId || body?.id || "").trim() ||
      (await getLatestBatchId());

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "NO_BATCH_FOUND" },
        { status: 400 }
      );
    }

    const origin = process.env.APP_BASE_URL || "http://localhost:3000";

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

    const latestVersion = await getLatestVersion(batchId);

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

    const report = await getLatestReport(batchId);

    const reportId = String(
      report?.id ||
        report?.report_id ||
        `RPT-${batchId}`
    ).trim();

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
      wrote: "supabase:batches,batch_versions,reports",
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