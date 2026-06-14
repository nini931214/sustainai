// app/admin/actions.ts

"use server";

/**
 * 這個檔案原本使用舊版 chain.json 的：
 * - addRecyclerBatch
 * - addProcessRecord
 * - addManufactureRecord
 *
 * 現在系統已改為 Supabase API，
 * 這些 Server Actions 已暫時停用。
 *
 * 保留函式名稱避免舊頁面 import 時 build 失敗。
 */

export async function createRecycleBatch(formData: FormData) {
  console.log("[DEPRECATED] createRecycleBatch", {
    id: formData.get("id"),
    material: formData.get("material"),
    kg: formData.get("kg"),
  });

  return {
    ok: true,
    message: "createRecycleBatch disabled (Supabase migration)",
  };
}

export async function createProcessRecord(formData: FormData) {
  console.log("[DEPRECATED] createProcessRecord", {
    batchId: formData.get("batchId"),
    energy: formData.get("energy"),
    yield: formData.get("yield"),
  });

  return {
    ok: true,
    message: "createProcessRecord disabled (Supabase migration)",
  };
}

export async function createManufactureRecord(formData: FormData) {
  console.log("[DEPRECATED] createManufactureRecord", {
    batchId: formData.get("batchId"),
    sku: formData.get("sku"),
    lot: formData.get("lot"),
  });

  return {
    ok: true,
    message: "createManufactureRecord disabled (Supabase migration)",
  };
}