// app/api/processor/update/route.ts
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
    const processorName =
      String(body.processorName || body.company || "").trim() || "Processor A";

    const input_kg = Number(body.input_kg || body.inputKg || 0);
    const output_kg = Number(body.output_kg || body.outputKg || 0);
    const waste_kg = Number(body.waste_kg || body.wasteKg || 0);
    const energy_kwh = Number(body.energy_kwh || body.energyKwh || 0);
    const water_l = Number(body.water_l || body.waterL || 0);

    if (!id) {
      return Response.json(
        { ok: false, error: "缺少批次 ID" },
        { status: 400 }
      );
    }

    const carbon = Number((energy_kwh * 0.509 + waste_kg * 0.2).toFixed(2));
    const nowIso = new Date().toISOString();

    const processorPayload = {
      id: "P1",
      name: processorName,
      ts: nowIso,
      input_kg,
      output_kg,
      waste_kg,
      energy_kwh,
      water_l,
      carbon,
    };

    const { data, error } = await supabase
      .from("batches")
      .update({
        processor: processorPayload,
        quantity: output_kg || input_kg,
        kg: output_kg || input_kg,
        weight: output_kg || input_kg,
        carbon,
        status: "processed",
        updated_at: nowIso,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase processor update error:", error);
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
        kg: data.kg ?? data.weight ?? data.quantity,
        recycler: data.recycler,
        processor: data.processor,
        manufacturer: data.manufacturer,
        audit: data.audit,
        raw: data,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/processor/update", err);
    return Response.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}