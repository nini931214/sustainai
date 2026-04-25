// lib/report/buildReportDoc.ts
import type { ReportDoc } from "./schema";
import { getBatchSummary } from "@/lib/summary";
import { hashJson } from "@/app/lib/crypto/hash";

export function buildReportDoc(params: {
  batch: any;
  origin: string;
  generatedAt: string; // YYYY-MM-DD
}): ReportDoc {
  const { batch, origin, generatedAt } = params;

  const summary = getBatchSummary(batch);
  const fp = summary.footprint;

  const totalCo2 = fp.total_co2e ?? 0;
  const transportShare =
    totalCo2 > 0 ? Math.round((fp.transport_co2e / totalCo2) * 100) : 0;
  const processShare =
    totalCo2 > 0 ? Math.round((fp.process_co2e / totalCo2) * 100) : 0;

  const inputKg = Number(batch.kg || 0);
  const outputKg = Number(batch.processor?.output_kg || 0);
  const wasteKg = Number(batch.processor?.waste_kg || 0);

  const reuseRatio = fp.reuse_ratio != null ? fp.reuse_ratio : 0;
  const reusePct = reuseRatio * 100;
  const savedCo2 = totalCo2 * 0.3;

  const mainSource =
    (fp.transport_co2e ?? 0) >= (fp.process_co2e ?? 0)
      ? "運輸"
      : "再生加工(處理廠)";

  const traceUrl = `${origin}/trace/${encodeURIComponent(batch.id)}`;

  return {
    meta: {
      batchId: batch.id,
      material: batch.material,
      generatedAt,
      traceUrl,
    },
    sections: [
      {
        id: "exec",
        title: "一句話管理摘要",
        paragraphs: [
          {
            text: `本批次「${batch.material}」回收材料的估算總碳排約 ${totalCo2.toFixed(
              2
            )} kg CO₂e，其中 ${mainSource} 為主要排放來源（運輸約 ${transportShare}%、再生加工約 ${processShare}%）。`,
            tags: ["ESG", "ISSB-S2"],
          },
          {
            text: `在回收投入 ${inputKg.toFixed(
              1
            )} kg 的前提下，保守估計相較原生塑膠流程可減少約 ${savedCo2.toFixed(
              2
            )} kg CO₂e；再利用率約 ${reusePct.toFixed(1)}%。`,
            tags: ["GRI-301", "ISSB-S2", "TRACE"],
          },
        ],
      },
      {
        id: "summary",
        title: "Summary 摘要",
        paragraphs: [
          {
            text: "本產品來源與處理流程已完成資料留存，具備可追溯性，並符合 ESG 永續揭露需求。",
            tags: ["ESG", "TRACE"],
          },
        ],
      },
      {
        id: "evidence",
        title: "Key Evidence 主要依據",
        paragraphs: [
          { text: "• 批次履歷（含 QR Code）", tags: ["TRACE"] },
          { text: "• 處理廠稽核紀錄", tags: ["AUDIT"] },
          { text: "• Multi-Role Console 操作紀錄", tags: ["AUDIT", "TRACE"] },
          { text: "• ESG Dashboard 指標彙整", tags: ["ESG"] },
          { text: "• AI 永續聲明生成紀錄", tags: ["ESG", "AUDIT"] },
        ],
      },
      {
        id: "gri",
        title: "GRI / ISSB 對應段落（示範）",
        paragraphs: [
          {
            text: `【GRI 301 – 材料使用與循環】投入回收材料 ${inputKg.toFixed(
              1
            )} kg（材質：${batch.material}），處理後輸出 ${outputKg.toFixed(
              1
            )} kg；報廢/損耗 ${wasteKg.toFixed(
              1
            )} kg；再利用率約 ${reusePct.toFixed(1)}%。`,
            tags: ["GRI-301", "TRACE"],
          },
          {
            text: `【GRI 306 – 廢棄物】再生處理產生廢棄物約 ${wasteKg.toFixed(
              1
            )} kg，建議補充最終去向（委外處理/能源回收/再分級使用）以提升循環效率。`,
            tags: ["GRI-306", "AUDIT"],
          },
          {
            text: `【ISSB S2 – 氣候】估算排放 ${totalCo2.toFixed(
              2
            )} kg CO₂e（含運輸與加工）；若改採原生流程，預估將增加約 ${savedCo2.toFixed(
              2
            )} kg CO₂e，顯示導入回收材料具實質減碳效益。`,
            tags: ["ISSB-S2", "ESG"],
          },
        ],
      },
      {
        id: "notes",
        title: "Notes 備註",
        paragraphs: [
          {
            text: "本文為系統生成之範例版本，實際內容將依據真實資料與審計需求即時更新。",
            tags: ["ESG"],
          },
        ],
      },
    ],
  };
}