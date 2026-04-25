// app/ai/page.tsx
import BackToFlow from "@/app/components/BackToFlow";

// 在 return 的 header 區塊裡
<div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
  <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
    AI 永續報告 Demo
  </h1>
  <BackToFlow />
</div>
import BatchSwitcher from "./components/BatchSwitcher";
import Link from "next/link";
import ReportWatermarkedShell from "../components/ReportWatermarkedShell";

import { listBatches, getBatchById } from "@/lib/chain";
import { getBatchSummary } from "@/lib/summary";

type Props = {
  searchParams?: {
    batch?: string;
  };
};

export default function AiReportPage({ searchParams }: Props) {
  const batches = listBatches();
  const queryId = searchParams?.batch;

  const batch =
    (queryId && getBatchById(queryId)) ||
    (batches.length > 0 ? batches[0] : undefined);

  if (!batch) {
    return (
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f7fb",
          padding: "32px 16px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            AI 永續報告 Demo
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
            目前系統中尚無任何批次資料，請先建立至少一筆示範批次。
          </p>
          <Link href="/home">
            <span style={{ fontSize: 13, color: "#2563eb", cursor: "pointer" }}>
              ← 返回首頁
            </span>
          </Link>
        </div>
      </main>
    );
  }

  const summary = getBatchSummary(batch);
  const fp = summary.footprint;

  const totalCo2 = fp.total_co2e ?? 0; // kg CO2e
  const transportShare =
    totalCo2 > 0 ? Math.round(((fp.transport_co2e ?? 0) / totalCo2) * 100) : 0;
  const processShare =
    totalCo2 > 0 ? Math.round(((fp.process_co2e ?? 0) / totalCo2) * 100) : 0;
  const recycleRate = fp.reuse_ratio != null ? fp.reuse_ratio * 100 : undefined;
  const savedCo2 = totalCo2 * 0.3;
  const mainSource =
    (fp.transport_co2e ?? 0) >= (fp.process_co2e ?? 0) ? "運輸" : "再生加工(處理廠)";

  const inputKg = Number(batch.kg || 0);
  const outputKg = Number(batch.processor?.output_kg || 0);
  const wasteKg = Number(batch.processor?.waste_kg || 0);
  const lossRate =
    inputKg > 0 ? Math.round((wasteKg / inputKg) * 100) : undefined;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "32px 16px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* ✅ 網頁版浮水印（跟 PDF 無關） */}
        <ReportWatermarkedShell
          demo={true}
          logoSrc="/brand/logo.png"
          opacity={0.07}
          rotateDeg={-18}
          maxWidthPercent={65}
        >
          {/* Header */}
          <header style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              🤖 SustainAI – 循環經濟永續報告 Demo
            </h1>

            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              此頁示範：如何根據「回收站、處理廠、製造商」的批次數據，自動生成
              <b> ESG / GRI / ISSB 風格</b> 的報告文字。
            </p>

            {/* ✅ 批次切換（選了就自動切） */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <BatchSwitcher batches={batches} currentId={batch.id} />

              {/* ✅ 下載 PDF（API 產生 + Logo 水印） */}
              <Link
                href={`/api/report/pdf-text?batch=${encodeURIComponent(batch.id)}`}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: "8px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  ⬇️ 下載 PDF（含水印）
                </span>
              </Link>

              <Link href="/flow">
                <span
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  回流程總覽
                </span>
              </Link>
            </div>

            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
              你也可以直接用網址切換：<code>?batch=批次ID</code>
            </p>
          </header>

          {/* 一句話摘要 */}
          <section
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 16,
              backgroundColor: "#ecfeff",
              border: "1px solid #bae6fd",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              🗣️ 一句話管理摘要
            </h2>
            <p style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.8 }}>
              本批次「{batch.material}」回收材料的估算總碳排約
              <b> {totalCo2.toFixed(2)} kg CO₂e</b>，
              其中<b> {mainSource} 環節為主要排放來源</b>
              （運輸約 {transportShare}%、再生加工約 {processShare}%）。在回收投入{" "}
              {inputKg.toFixed(1)} kg 的前提下，保守估計相較原生塑膠流程可
              <b> 減少約 {savedCo2.toFixed(2)} kg CO₂e</b>。
              {recycleRate != null && (
                <>
                  {" "}
                  整體<b> 再利用率約 {recycleRate.toFixed(1)}%</b>
                  ，顯示大部分回收料已成功導入再製與產品應用。
                </>
              )}
            </p>
          </section>

          {/* GRI / ISSB 報告段落 */}
          <section
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
              📘 GRI / ISSB 對應報告段落（簡化示範）
            </h2>

            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#111827",
                }}
              >
                【GRI 301 – 材料使用與循環】
              </p>
              <p style={{ fontSize: 13, color: "#111827", lineHeight: 1.8 }}>
                本批次共投入回收塑膠材料 <b>{inputKg.toFixed(1)} kg</b>，材質類型為「
                {batch.material}」。經處理廠 {batch.processor?.name || "處理廠"} 再生處理後，
                輸出可再利用材料約 <b>{outputKg.toFixed(1)} kg</b>
                {lossRate != null && (
                  <>
                    ，再生過程中產生報廢損耗約 <b>{wasteKg.toFixed(1)} kg</b>
                    （約占投入量的 {lossRate}%）。
                  </>
                )}{" "}
                依據再利用率約{" "}
                {recycleRate != null ? recycleRate.toFixed(1) : "0.0"}% 推估，
                本批次成功將多數回收料導入後續製造流程，降低對原生塑膠的依賴。
              </p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#111827",
                }}
              >
                【GRI 306 – 廢棄物產生與處理】
              </p>
              <p style={{ fontSize: 13, color: "#111827", lineHeight: 1.8 }}>
                在本批次的再生處理過程中，回收材料經分類、清洗與再生造粒等程序，合計產生廢棄物約{" "}
                <b>{wasteKg.toFixed(1)} kg</b>。企業後續可進一步說明報廢部分的處理方式（例如：
                能源回收、委外處理或再次分級使用），以提升整體材料循環效率並降低廢棄物最終處置比例。
              </p>
            </div>

            <div style={{ marginBottom: 4 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#111827",
                }}
              >
                【ISSB S2 – 氣候相關風險與機會】
              </p>
              <p style={{ fontSize: 13, color: "#111827", lineHeight: 1.8 }}>
                本批次回收與再生活動的估算碳排放量為{" "}
                <b>{totalCo2.toFixed(2)} kg CO₂e</b>，包含運輸與再生加工能源使用。依據內部假設基準，
                若改採原生塑膠生產，相同產品批次之排放量預估將增加約{" "}
                <b>{savedCo2.toFixed(2)} kg CO₂e</b>。此結果顯示導入回收材料具有實質減碳效益，
                並有助於公司在中長期氣候目標與淨零路徑中的落實。
              </p>
            </div>
          </section>

          {/* 結論與後續行動建議 */}
          <section
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              ✅ 結論與下一步建議
            </h2>
            <ul
              style={{
                fontSize: 13,
                color: "#111827",
                lineHeight: 1.8,
                paddingLeft: 18,
                marginBottom: 6,
              }}
            >
              <li>
                就單一批次而言，本案已展現出具體的循環材料使用與減碳潛力，未來可擴大至更多材料與產品線。
              </li>
              <li>
                建議持續蒐集「運輸里程、用電來源、廢棄物實際去向」等數據，以提升排放估算與報告的準確性。
              </li>
              <li>
                正式導入 LLM 後，可將本頁模板擴充為完整 ESG 章節（含封面、圖表與管理方針），一鍵匯出 PDF 報告。
              </li>
            </ul>
            <p style={{ fontSize: 11, color: "#9ca3af" }}>
              註：本頁內容為 Demo 模式，係數與文字生成邏輯可依企業實際排放因子、報告框架與審計需求調整。
            </p>
          </section>

          {/* 底部導覽 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/dashboard">
                <span style={{ color: "#2563eb", cursor: "pointer" }}>
                  ← 返回 Dashboard
                </span>
              </Link>
              <Link href={`/trace/${encodeURIComponent(batch.id)}`}>
                <span style={{ color: "#2563eb", cursor: "pointer" }}>
                  查看該批次產品履歷
                </span>
              </Link>
            </div>
            <Link href="/flow">
              <span style={{ color: "#6b7280", cursor: "pointer" }}>
                回流程總覽
              </span>
            </Link>
          </div>
        </ReportWatermarkedShell>
      </div>
    </main>
  );
}