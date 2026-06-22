// app/api/recent/route.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAudit(row: any) {
  const status =
    row.status === "approved" || row.status === "rejected" || row.status === "pending"
      ? row.status
      : row.audit?.status || "pending";

  return {
    ...(row.audit || {}),
    status,
    by: row.audit?.by || "—",
    ts: row.audit?.ts || row.updated_at || row.created_at || null,
    note: row.audit?.note || null,
  };
}

function normalizeBatch(row: any) {
  if (!row) return null;

  const role = String(row.role || "").toLowerCase();
  const company = row.company || "—";

  return {
    ...row,
    id: row.id,
    batchId: row.id,
    material: row.material ?? "—",
    kg: Number(row.kg ?? row.weight ?? row.quantity ?? 0),
    weight: Number(row.weight ?? row.kg ?? row.quantity ?? 0),

    recycler:
      row.recycler ??
      (role === "recycler" || row.company ? { name: company } : null),

    processor:
      row.processor ??
      (role === "processor"
        ? { name: company, energy_kwh: Number(row.carbon ?? 0) }
        : null),

    manufacturer:
      row.manufacturer ??
      (role === "manufacturer" ? { name: company } : null),

    audit: normalizeAudit(row),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get("limit") || 50))
    );

    const { data, error } = await supabaseAdmin
      .from("batches")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (data ?? []).map(normalizeBatch).filter(Boolean);

    return Response.json(
      {
        ok: true,
        items,
        batches: items,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
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