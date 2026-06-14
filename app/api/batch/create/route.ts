// app/api/batch/create/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ensureId(prefix = "BATCH") {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${y}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = String(body?.id || "").trim() || ensureId("BATCH");
    const material = String(body?.material || "PET").trim();
    const quantity = Number(body?.kg ?? body?.quantity ?? 0);

    const company =
      String(
        body?.company ||
          body?.createdBy ||
          body?.recycler?.name ||
          "Recycler A"
      ).trim() || "Recycler A";

    const role = String(body?.createdByRole || body?.role || "recycler").trim();

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "quantity 必須大於 0" },
        { status: 400 }
      );
    }

    const newBatch = {
      id,
      role,
      company,
      material,
      quantity,
      carbon: Number((quantity * 0.12).toFixed(2)),
      status: "created",
    };

    const { data, error } = await supabaseAdmin
      .from("batches")
      .insert([newBatch])
      .select("*")
      .single();

    if (error) {
      console.error("Supabase batch create error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      batch: data,
    });
  } catch (err: any) {
    console.error("Error in /api/batch/create", err);
    return NextResponse.json(
      {
        ok: false,
        error: "BATCH_CREATE_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const id = url.searchParams.get("id") || "";
  const material = url.searchParams.get("material") || "PET";
  const kg = Number(url.searchParams.get("kg") || 20);
  const createdBy = url.searchParams.get("createdBy") || "Recycler A";
  const createdByRole = url.searchParams.get("createdByRole") || "recycler";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        material,
        kg,
        createdBy,
        createdByRole,
      }),
    })
  );
}