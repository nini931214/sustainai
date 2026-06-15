// lib/chain.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeBatch(row: any) {
  if (!row) return null;

  const role = String(row.role || "").toLowerCase();
  const company = row.company || "—";

  return {
    ...row,
    id: row.id,
    batchId: row.id,
    material: row.material ?? "—",
    kg: Number(row.kg ?? row.quantity ?? 0),
    weight: Number(row.weight ?? row.quantity ?? 0),

    recycler:
      row.recycler ??
      (role === "recycler"
        ? { name: company }
        : row.company
        ? { name: company }
        : null),

    processor:
      row.processor ??
      (role === "processor" ? { name: company, energy_kwh: Number(row.carbon ?? 0) } : null),

    manufacturer:
      row.manufacturer ??
      (role === "manufacturer" ? { name: company } : null),

    audit:
      row.audit ??
      {
        status:
          row.status === "approved" || row.status === "rejected" || row.status === "pending"
            ? row.status
            : "pending",
        by: "—",
        ts: row.updated_at ?? row.created_at ?? null,
      },
  };
}

export async function listBatches() {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeBatch).filter(Boolean);
}

export async function getBatchById(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw error;
  return normalizeBatch(data);
}