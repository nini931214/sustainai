"use server";

import {
  addRecyclerBatch,
  addProcessRecord,
  addManufactureRecord,
} from "@/lib/chain";

/**
 * 回收站：建立批次
 */
export async function createRecycleBatch(formData: FormData) {
  const id = formData.get("id")?.toString() || "";
  const material = formData.get("material")?.toString() || "";
  const kg = Number(formData.get("kg") || 0);

  await addRecyclerBatch({
    batchId: id,
    material,
    kg,
  });
}

/**
 * 處理廠：處理紀錄
 */
export async function createProcessRecord(formData: FormData) {
  const batchId = formData.get("batchId")?.toString() || "";
  const energy = Number(formData.get("energy") || 0);
  const yieldRate = Number(formData.get("yield") || 0);

  await addProcessRecord({
    batchId,
    energy_kwh: energy,
    yield: yieldRate,
  });
}

/**
 * 製造商：產品紀錄
 */
export async function createManufactureRecord(formData: FormData) {
  const batchId = formData.get("batchId")?.toString() || "";
  const sku = formData.get("sku")?.toString() || "";
  const lot = formData.get("lot")?.toString() || "";

  await addManufactureRecord({
    batchId,
    sku,
    lot,
  });
}