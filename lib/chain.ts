// lib/chain.ts
import raw from "@/data/chain.json";

export type ActorRef = {
  id: string;
  name: string;
};

export type BatchAudit = {
  status: "pending" | "approved" | "rejected";
  note?: string;
  ts?: number;
  by?: string;
};

export type BatchRecord = {
  id: string;
  material: string;
  kg: number;
  recycler?: ActorRef;
  processor?: ActorRef & {
    energy_kwh?: number;
    input_kg?: number;
    output_kg?: number;
  };
  manufacturer?: ActorRef & {
    product_sku?: string;
    product_lot?: string;
  };
  transport?: {
    distance_km?: number;
    mode?: string;
  };
  audit?: BatchAudit;
  created_at?: string;
  ts?: number;
};

const BATCHES: BatchRecord[] = Array.isArray(raw)
  ? raw.map((r: any) => ({
      ...r,
      kg: Number(r.kg ?? 0),
    }))
  : [];

/** 列出所有批次（recent / dashboard 用） */
export function listBatches(): BatchRecord[] {
  return BATCHES;
}

/** 依照批次 ID 取得單一批次（trace / auditor 用） */
export function getBatchById(id: string): BatchRecord | undefined {
  return BATCHES.find((b) => b.id === id);
}