// app/api/recent/route.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getAuditStatus(row: any) {
  const auditStatus = row?.audit?.status;
  const rowStatus = row?.status;

  if (["approved", "rejected", "pending"].includes(rowStatus)) return rowStatus;
  if (["approved", "rejected", "pending"].includes(auditStatus)) return auditStatus;

  return "pending";
}

function normalizeBatch(row: any) {
  if (!row) return null;

  const role = String(row.role || "").toLowerCase();
  const company = row.company || "—";
  const auditStatus = getAuditStatus(row);

  return {
    ...row,
    id: row.id,
    batchId: row.id,
    material: row.material ?? "—",
    kg: Number(row.kg ?? row.weight ?? row.quantity ?? 0),
    weight: Number(row.weight ?? row.kg ?? row.quantity ?? 0),

    recycler:
      row.recycler ??
      (role === "recycler" || row.company
        ? { name: company, role: role || "recycler", ts: row.created_at ?? row.updated_at }
        : null),

    processor: row.processor ?? null,
    manufacturer: row.manufacturer ?? null,

    audit: {
      ...(row.audit || {}),
      status: auditStatus,
      by: row.audit?.by ?? "—",
      ts: row.audit?.ts ?? row.updated_at ?? row.created_at ?? null,
      note: row.audit?.note ?? null,
    },

    status: auditStatus,
    updated_at: row.updated_at,
    created_at: row.created_at,
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
        ts: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return Response.json(
      {
        ok: false,
        error: err?.message || "internal_error",
        items: [],
        batches: [],
      },
      { status: 500 }
    );
  }
}