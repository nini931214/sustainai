// app/api/admin/backfill-verify/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function makeReportPayloadFromBatch(batch: any) {
  return {
    batchId: String(batch?.id || ""),
    material: batch?.material ?? null,
    kg: batch?.kg ?? batch?.weight ?? null,
    recycler: batch?.recycler ?? null,
    processor: batch?.processor ?? null,
    manufacturer: batch?.manufacturer ?? null,
    transport: batch?.transport ?? null,
    audit: batch?.audit ?? null,
    ts: batch?.ts ?? batch?.created_at ?? null,
  };
}

function makeReportId(batchId: string) {
  return `RPT-${batchId.replace(/^BATCH-/, "")}`;
}

function makeBatchVersionId(batchId: string) {
  return `${batchId}-V1`;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "approved-only").trim();

    const { data: batches, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (batchError) throw batchError;

    const updated: Array<{
      batchId: string;
      reportId: string;
      batchVersionId: string;
      batchVersionHash: string;
    }> = [];

    const skipped: Array<{
      batchId: string;
      reason: string;
    }> = [];

    for (const batch of batches ?? []) {
      const batchId = String(batch?.id || "").trim();
      if (!batchId) continue;

      const status = String(batch?.audit?.status || batch?.status || "").toLowerCase();

      if (mode !== "all" && status !== "approved") {
        skipped.push({
          batchId,
          reason: `audit.status=${status || "missing"}`,
        });
        continue;
      }

      if (batch?.report_id && batch?.batch_version_id && batch?.batch_version_hash) {
        skipped.push({
          batchId,
          reason: "already has report_id/batch_version_id/batch_version_hash",
        });
        continue;
      }

      const reportId = batch?.report_id
        ? String(batch.report_id)
        : makeReportId(batchId);

      const batchVersionId = batch?.batch_version_id
        ? String(batch.batch_version_id)
        : makeBatchVersionId(batchId);

      const reportPayload = makeReportPayloadFromBatch(batch);
      const reportPayloadHash = sha256Hex(stableJson(reportPayload));

      const { data: existingReport, error: reportFindError } = await supabaseAdmin
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (reportFindError) throw reportFindError;

      if (!existingReport) {
        const { error: reportInsertError } = await supabaseAdmin
          .from("reports")
          .insert({
            id: reportId,
            batch_id: batchId,
            report_payload: reportPayload,
            report_payload_hash: reportPayloadHash,
            ai_summary: null,
            status: "generated",
            audit_time_iso: nowIso(),
            time_source: "backfill",
          });

        if (reportInsertError) throw reportInsertError;
      }

      const versionMessage = `${batchId}|${batchVersionId}|${reportPayloadHash}`;
      const batchVersionHash = sha256Hex(versionMessage);

      const { data: existingVersion, error: versionFindError } = await supabaseAdmin
        .from("batch_versions")
        .select("*")
        .eq("batch_id", batchId)
        .eq("batch_version_id", batchVersionId)
        .maybeSingle();

      if (versionFindError) throw versionFindError;

      if (!existingVersion) {
        const { error: versionInsertError } = await supabaseAdmin
          .from("batch_versions")
          .insert({
            batch_id: batchId,
            batch_version_id: batchVersionId,
            hash: batchVersionHash,
            payload_hash: reportPayloadHash,
            payload: reportPayload,
            signature: "",
            signer: "backfill",
            signer_name: "Backfill Script",
            alg: "RSA-SHA256",
            ots: null,
          });

        if (versionInsertError) throw versionInsertError;
      }

      const { error: batchUpdateError } = await supabaseAdmin
        .from("batches")
        .update({
          report_id: reportId,
          batch_version_id: batchVersionId,
          batch_version_hash: batchVersionHash,
          report_payload_hash: reportPayloadHash,
          updated_at: nowIso(),
        })
        .eq("id", batchId);

      if (batchUpdateError) throw batchUpdateError;

      updated.push({
        batchId,
        reportId,
        batchVersionId,
        batchVersionHash,
      });
    }

    return NextResponse.json({
      ok: true,
      mode,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      updated,
      skipped: skipped.slice(0, 20),
      hint: "Backfill 完成後，可以用 /verify?reportId=...&batchId=...&batchVersionHash=... 測試驗證。",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "BACKFILL_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}