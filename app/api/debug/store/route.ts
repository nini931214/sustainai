// app/api/debug/storage/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { count: batchCount, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*", { count: "exact", head: true });

    if (batchError) throw batchError;

    const { count: versionCount, error: versionError } = await supabaseAdmin
      .from("batch_versions")
      .select("*", { count: "exact", head: true });

    if (versionError) throw versionError;

    const { count: reportCount, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*", { count: "exact", head: true });

    if (reportError) throw reportError;

    const { data: sampleBatch } = await supabaseAdmin
      .from("batches")
      .select("*")
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,

      storage: "supabase",

      tables: {
        batches: batchCount ?? 0,
        batch_versions: versionCount ?? 0,
        reports: reportCount ?? 0,
      },

      sampleBatchKeys: sampleBatch
        ? Object.keys(sampleBatch)
        : [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "SUPABASE_CHECK_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}