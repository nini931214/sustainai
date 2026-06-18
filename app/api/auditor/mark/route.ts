// app/api/auditor/mark/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || "").trim();
    const status = String(body?.status || "").trim() as
      | "approved"
      | "rejected"
      | "pending";
    const by = String(body?.by || "ESG Auditor").trim();
    const note = String(body?.note || "").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const audit = {
      status,
      by,
      note: note || null,
      ts: nowIso,
    };

    const { data: updatedBatch, error: updateError } = await supabaseAdmin
      .from("batches")
      .update({
        status,
        audit,
        updated_at: nowIso,
      })
      .eq("id", batchId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: `auditor_${status}`,
      actor_role: "auditor",
      payload: {
        batchId,
        status,
        audit,
      },
    });

    return NextResponse.json({
      ok: true,
      batchId,
      status,
      audit,
      batch: updatedBatch,
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

export async function GET(req: Request) {
  const url = new URL(req.url);

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: url.searchParams.get("batchId") || "",
        status: url.searchParams.get("status") || "",
        by: url.searchParams.get("by") || "ESG Auditor",
        note: url.searchParams.get("note") || "",
      }),
    })
  );
}