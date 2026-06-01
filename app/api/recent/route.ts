// app/api/recent/route.ts
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

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();

    const { searchParams } = new URL(req.url);

    const limit = Math.max(
      1,
      Math.min(50, Number(searchParams.get("limit") || 50))
    );

    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase recent error:", error);

      return Response.json(
        {
          ok: false,
          error: error.message,
          items: [],
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      items: data ?? [],
    });
  } catch (err: any) {
    console.error("Error in /api/recent", err);

    return Response.json(
      {
        ok: false,
        error: err?.message || "internal_error",
        items: [],
      },
      { status: 500 }
    );
  }
}