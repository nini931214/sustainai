// app/api/exchange/export/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .or(`id.eq.${reportId},report_id.eq.${reportId}`)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "REPORT_NOT_FOUND", reportId },
        { status: 404 }
      );
    }

    const batchId = String(report?.batch_id || report?.batchId || "").trim();

    const batchVersionHash = String(
      report?.batch_version_hash || report?.batchVersionHash || ""
    ).trim();

    const batchVersionId = String(
      report?.batch_version_id || report?.batchVersionId || ""
    ).trim();

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) throw batchError;

    let version = null;

    if (batchVersionHash) {
      const { data, error } = await supabaseAdmin
        .from("batch_versions")
        .select("*")
        .eq("batch_id", batchId)
        .eq("hash", batchVersionHash)
        .maybeSingle();

      if (error) throw error;
      version = data;
    }

    if (!version && batchVersionId) {
      const { data, error } = await supabaseAdmin
        .from("batch_versions")
        .select("*")
        .eq("batch_id", batchId)
        .eq("batch_version_id", batchVersionId)
        .maybeSingle();

      if (error) throw error;
      version = data;
    }

    if (!version) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_VERSION_NOT_FOUND",
          batchId,
          reportId,
        },
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