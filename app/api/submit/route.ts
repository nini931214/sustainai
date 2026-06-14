// app/api/report/submit/route.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stableStringify(input: any): string {
  const seen = new WeakSet();

  const sorter = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;

    if (seen.has(value)) return "[Circular]";
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

function makeReportId() {
  return `RPT-${Date.now()}`;
}

async function getLatestBatchVersion(batchId: string) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body.batchId || body.batch_id || "").trim();
    const reportPayload = body.report_payload ?? body.reportPayload;

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    if (!reportPayload || typeof reportPayload !== "object") {
      return NextResponse.json(
        { ok: false, error: "MISSING_REPORT_PAYLOAD" },
        { status: 400 }
      );
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) throw batchError;

    if (!batch) {
      return NextResponse.json(
        { ok: false, error: "BATCH_NOT_FOUND", batchId },
        { status: 404 }
      );
    }

    const latestVersion = await getLatestBatchVersion(batchId);

    const batchVersionId =
      String(
        body.batchVersionId ||
          body.batch_version_id ||
          latestVersion?.batch_version_id ||
          batch?.batch_version_id ||
          `${batchId}@ts:${batch?.audit?.ts || batch?.ts || batch?.created_at || Date.now()}`
      ).trim();

    const batchVersionHash =
      String(
        body.batchVersionHash ||
          body.batch_version_hash ||
          latestVersion?.hash ||
          batch?.batch_version_hash ||
          ""
      ).trim();

    const reportPayloadHash = sha256Hex(stableStringify(reportPayload));

    const reportId = String(
      body.reportId || body.report_id || makeReportId()
    ).trim();

    const nowIso = new Date().toISOString();

    const reportRecord = {
      id: reportId,
      report_id: reportId,
      batch_id: batchId,
      batch_version_id: batchVersionId,
      batch_version_hash: batchVersionHash || null,
      report_payload: reportPayload,
      report_payload_hash: reportPayloadHash,
      audit_time_iso: nowIso,
      time_source: "api/report/submit",
      status: String(body.status || "submitted"),
      created_at: nowIso,
    };

    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .upsert(reportRecord, { onConflict: "id" })
      .select()
      .single();

    if (reportError) throw reportError;

    const { error: batchUpdateError } = await supabaseAdmin
      .from("batches")
      .update({
        report_id: reportId,
        batch_version_id: batchVersionId,
        batch_version_hash: batchVersionHash || batch?.batch_version_hash || null,
        report_payload_hash: reportPayloadHash,
        updated_at: nowIso,
      })
      .eq("id", batchId);

    if (batchUpdateError) throw batchUpdateError;

    const { error: logError } = await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: "report_submitted",
      actor_role: "system",
      payload: {
        reportId,
        batchId,
        batchVersionId,
        batchVersionHash,
        reportPayloadHash,
      },
    });

    if (logError) {
      console.warn("audit_logs insert failed:", logError.message);
    }

    return NextResponse.json({
      ok: true,
      report,
      verifyUrl: `/verify?reportId=${encodeURIComponent(reportId)}&batchId=${encodeURIComponent(
        batchId
      )}${
        batchVersionHash
          ? `&batchVersionHash=${encodeURIComponent(batchVersionHash)}`
          : ""
      }&batchVersionId=${encodeURIComponent(
        batchVersionId
      )}&reportPayloadHash=${encodeURIComponent(reportPayloadHash)}`,
      wrote: "supabase:reports,batches,audit_logs",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "REPORT_SUBMIT_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}