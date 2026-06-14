// app/api/auditor/mark/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auditor/mark
 * body: {
 *   batchId: string,
 *   status: "approved" | "rejected" | "pending",
 *   by?: string,
 *   note?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || "").trim();
    const status = String(body?.status || "").trim();
    const by = String(body?.by || "ESG Auditor").trim();
    const note = String(body?.note || "").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID", required: ["batchId"] },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_STATUS",
          allowed: ["approved", "rejected", "pending"],
        },
        { status: 400 }
      );
    }

    const { data: existingBatch, error: findError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (findError) throw findError;

    if (!existingBatch) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_NOT_FOUND",
          batchId,
          hint: "Check Supabase table: batches",
        },
        { status: 404 }
      );
    }

    // 你的 UI formatTs 原本期待 number，所以這裡繼續用 Date.now()
    const ts = Date.now();

    const audit = {
      status,
      by,
      ts,
      ...(note ? { note } : {}),
    };

    const { data: updatedBatch, error: updateError } = await supabaseAdmin
      .from("batches")
      .update({
        audit,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 順便寫入 audit_logs，之後稽核履歷頁可以用
    const { error: logError } = await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: `auditor_${status}`,
      actor_role: "auditor",
      payload: {
        audit,
        by,
        note,
      },
    });

    if (logError) {
      console.warn("audit_logs insert failed:", logError.message);
    }

    return NextResponse.json({
      ok: true,
      batchId,
      audit,
      batch: updatedBatch,
      wrote: "supabase:batches,audit_logs",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AUDITOR_MARK_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

/**
 * 方便你用瀏覽器直接測：
 * GET /api/auditor/mark?batchId=BATCH-2025-003&status=rejected&by=ESG%20Auditor&note=缺少文件
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  const batchId = url.searchParams.get("batchId") || "";
  const status = url.searchParams.get("status") || "";
  const by = url.searchParams.get("by") || "ESG Auditor";
  const note = url.searchParams.get("note") || "";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, status, by, note }),
    })
  );
}