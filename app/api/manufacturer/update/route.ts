// app/api/manufacturer/update/route.ts
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

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));

    const id = String(body.id || body.batchId || "").trim();
    const manufacturerName =
      String(body.manufacturerName || body.company || "").trim() ||
      "Manufacturer A";

    const product_name =
      String(body.product_name || body.productName || "").trim() ||
      "Demo Product";

    const sku = String(body.sku || "").trim() || "SKU-001";
    const qty = Number(body.qty || body.quantity || 0);

    if (!id) {
      return Response.json(
        { ok: false, error: "缺少批次 ID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("batches")
      .update({
        role: "manufacturer",
        company: manufacturerName,
        quantity: qty,
        status: "manufactured",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase manufacturer update error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { ok: false, error: "批次不存在" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      batch: {
        id: data.id,
        batchId: data.id,
        material: data.material,
        kg: data.quantity,
        manufacturer: {
          id: "M1",
          name: manufacturerName,
          ts: Date.now(),
          product_name,
          sku,
          qty,
        },
        raw: data,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/manufacturer/update", err);
    return Response.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}