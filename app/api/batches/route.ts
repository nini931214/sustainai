// app/api/batches/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase batches error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          batches: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      batches: data ?? [],
    });
  } catch (err: any) {
    console.error("Error in /api/batches", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "internal_error",
        batches: [],
      },
      { status: 500 }
    );
  }
}