// lib/chain.ts

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function listBatches() {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getBatchById(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw error;

  return data;
}