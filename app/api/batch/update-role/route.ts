// app/api/batch/update-role/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = String(body.id || body.batchId || "").trim();
    const role = String(body.role || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "缺少批次 ID" },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { ok: false, error: "缺少 role" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("batches")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Supabase update-role error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      batch: data,
    });
  } catch (err: any) {
    console.error("Error in /api/batch/update-role", err);
    return NextResponse.json(
      {
        ok: false,
        error: "UPDATE_ROLE_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}