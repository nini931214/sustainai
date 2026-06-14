// lib/summary.ts

export type BatchRecord = any;

const EMISSION_FACTOR_TRANSPORT_TRUCK = 0.1;
const EMISSION_FACTOR_GRID = 0.5;

export type FootprintResult = {
  transport_co2e: number;
  process_co2e: number;
  total_co2e: number;
  reuse_ratio?: number;
};

export async function loadBatch(batchId: string) {
  const { getBatchById } = await import("./chain");
  return getBatchById(batchId);
}

export function computeFootprint(batch: BatchRecord): FootprintResult {
  const kg = Number(batch?.kg ?? batch?.quantity ?? 0);
  const carbon = Number(batch?.carbon ?? 0);

  const weightTon = kg / 1000;

  const distanceKm = Number(
    batch?.transport?.distance_km ??
      batch?.transport?.km ??
      batch?.recycler?.distance_km ??
      batch?.recycler?.km ??
      0
  );

  const transport_co2e =
    distanceKm * weightTon * EMISSION_FACTOR_TRANSPORT_TRUCK;

  const energyKwh = Number(
    batch?.processor?.energy_kwh ??
      batch?.processorEnergyKwh ??
      0
  );

  const process_co2e =
    energyKwh > 0 ? energyKwh * EMISSION_FACTOR_GRID : carbon;

  const total_co2e =
    carbon > 0 ? carbon : transport_co2e + process_co2e;

  const inputKg = Number(
    batch?.processor?.input_kg ??
      batch?.input_kg ??
      kg
  );

  const outputKg = Number(
    batch?.processor?.output_kg ??
      batch?.output_kg ??
      kg * 0.85
  );

  const reuse_ratio =
    inputKg > 0 ? Math.max(0, Math.min(1, outputKg / inputKg)) : undefined;

  return {
    transport_co2e,
    process_co2e,
    total_co2e,
    reuse_ratio,
  };
}

export function buildAiSentence(
  batch: BatchRecord,
  fp: FootprintResult
): string {
  const { transport_co2e, process_co2e, total_co2e, reuse_ratio } = fp;

  if (total_co2e <= 0) {
    return "本批次目前尚未有足夠數據估算碳足跡，但已完成回收與再生流程紀錄。";
  }

  const mainSource =
    transport_co2e >= process_co2e ? "運輸" : "再生加工（處理廠）";

  const mainValue = Math.max(transport_co2e, process_co2e);

  const mainPct =
    total_co2e > 0 ? Math.round((mainValue / total_co2e) * 100) : 0;

  const reuseText =
    reuse_ratio != null
      ? `目前再利用率約為 ${(reuse_ratio * 100).toFixed(1)}%，`
      : "";

  return `本批次「${batch?.material ?? "Unknown"}」估算總碳足跡約 ${total_co2e.toFixed(
    2
  )} 公斤 CO2e，其中以${mainSource}環節佔比最高（約 ${mainPct}%）。${reuseText}若針對此環節優化，預期可額外減碳約 10% 左右。`;
}

export function getBatchSummary(batch: BatchRecord) {
  const fp = computeFootprint(batch);
  const ai_sentence = buildAiSentence(batch, fp);

  return {
    footprint: fp,
    ai_sentence,
  };
}

export function makeNarrative(batch: BatchRecord | undefined) {
  if (!batch) return "找不到批次資料。";

  const summary = getBatchSummary(batch);

  const kg = Number(batch?.kg ?? batch?.quantity ?? 0);

  return `
批次 ${batch?.id ?? "—"} 使用 ${batch?.material ?? "Unknown"}，重量 ${kg} kg。
回收商：${batch?.recycler?.name || batch?.company || "未登錄"}
處理廠：${batch?.processor?.name || "未登錄"}
製造商：${batch?.manufacturer?.name || "未登錄"}
目前稽核狀態：${batch?.audit?.status || batch?.status || "pending"}

${summary.ai_sentence}
  `.trim();
}