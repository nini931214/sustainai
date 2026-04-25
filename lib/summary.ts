// lib/summary.ts
import type { BatchRecord } from './chain';

// 示意用排放因子（之後可以改成從資料庫 / API 拿權威數值）
const EMISSION_FACTOR_TRANSPORT_TRUCK = 0.1; // kg CO2e / 噸‧公里（示意值）
const EMISSION_FACTOR_GRID = 0.5; // kg CO2e / kWh（示意值）

export type FootprintResult = {
  transport_co2e: number;
  process_co2e: number;
  total_co2e: number;
  reuse_ratio?: number; // 再利用率 (0–1)
};

/** 計算一個批次的簡易碳足跡 */
export function computeFootprint(batch: BatchRecord): FootprintResult {
  const weightTon = (batch.kg || 0) / 1000;

  const distanceKm = batch.transport?.distance_km ?? 0;
  const transport_co2e =
    distanceKm * weightTon * EMISSION_FACTOR_TRANSPORT_TRUCK;

  const energyKwh = batch.processor?.energy_kwh ?? 0;
  const process_co2e = energyKwh * EMISSION_FACTOR_GRID;

  const total_co2e = transport_co2e + process_co2e;

  const inputKg = batch.processor?.input_kg ?? batch.kg ?? 0;
  const outputKg = batch.processor?.output_kg ?? 0;
  const reuse_ratio =
    inputKg > 0 ? Math.max(0, Math.min(1, outputKg / inputKg)) : undefined;

  return {
    transport_co2e,
    process_co2e,
    total_co2e,
    reuse_ratio,
  };
}

/** 產生一段 AI 式的一句話洞察（目前用規則生成，之後可以接 LLM） */
export function buildAiSentence(
  batch: BatchRecord,
  fp: FootprintResult,
): string {
  const { transport_co2e, process_co2e, total_co2e, reuse_ratio } = fp;

  if (total_co2e <= 0) {
    return '本批次目前尚未有足夠數據估算碳足跡，但已完成回收與再生流程紀錄。';
  }

  const mainSource =
    transport_co2e >= process_co2e ? '運輸' : '再生加工（處理廠）';
  const mainValue = Math.max(transport_co2e, process_co2e);
  const mainPct =
    total_co2e > 0 ? Math.round((mainValue / total_co2e) * 100) : 0;

  const reuseText =
    reuse_ratio != null
      ? `目前再利用率約為 ${(reuse_ratio * 100).toFixed(1)}%，`
      : '';

  // 示意：假裝若優化主要來源 10%，就可以減少 10% 排放
  const potentialSaving = 10;

  return `本批次「${batch.material}」估算總碳足跡約 ${total_co2e.toFixed(
    2,
  )} 公斤 CO2e，其中以${mainSource}環節佔比最高（約 ${mainPct}%）。${reuseText}若針對此環節優化（例如縮短運輸距離、提升能源效率），預期可額外減碳約 ${potentialSaving}% 左右。`;
}

/** 封裝給前端用的摘要物件 */
export function getBatchSummary(batch: BatchRecord) {
  const fp = computeFootprint(batch);
  const ai_sentence = buildAiSentence(batch, fp);

  return {
    footprint: fp,
    ai_sentence,
  };
}