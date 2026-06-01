// app/api/recycler/create/route.ts
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log("SUPABASE_URL =", supabaseUrl);
console.log("SUPABASE_KEY_EXISTS =", !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function generateBatchId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BATCH-${year}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();

    const body = await req.json().catch(() => ({}));

    const material = String(body.material || "").trim() || "PET";
    const kg = Number(body.kg || body.quantity || 0);
    const recyclerName =
      String(body.recyclerName || body.company || "").trim() || "Recycler A";

    if (!kg || kg <= 0) {
      return Response.json(
        { ok: false, error: "kg 必須大於 0" },
        { status: 400 }
      );
    }

    const id = generateBatchId();

    const newBatch = {
      id,
      role: "recycler",
      company: recyclerName,
      material,
      quantity: kg,
      carbon: Number((kg * 0.12).toFixed(2)),
      status: "created",
    };

   const { error } = await supabase.from("batches").insert([newBatch]);

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      batch: {
        id,
        batchId: id,
        material,
        kg,
        recycler: {
          id: "R1",
          name: recyclerName,
          ts: Date.now(),
        },
        ts: Date.now(),
      },
    });
  } catch (err: any) {
    console.error("Error in /api/recycler/create", err);
    return Response.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}