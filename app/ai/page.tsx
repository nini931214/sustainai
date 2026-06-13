// app/ai/page.tsx
import BackToFlow from "@/app/components/BackToFlow";
import BatchSwitcher from "./components/BatchSwitcher";
import Link from "next/link";
import ReportWatermarkedShell from "../components/ReportWatermarkedShell";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    batch?: string;
  };
};

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function normalizeBatch(row: any) {
  const kg = Number(row.quantity || 0);
  const carbon = Number(row.carbon || kg * 0.12);

  return {
    id: row.id,
    material: row.material || "Unknown",
    kg,
    carbon,
    company: row.company || "未登錄",
    role: row.role || "-",
    status: row.status || "pending",
    processor: {
      name:
        row.status === "processed" || row.status === "manufactured"
          ? row.company || "處理廠"
          : "尚未處理",
      output_kg: kg * 0.85,
      waste_kg: kg * 0.15,
    },
  };
}

export default async function AiReportPage({ searchParams }: Props) {
  const supabase = getSupabase();
  const queryId = searchParams?.batch;

  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  const batches = (data ?? []).map(normalizeBatch);

  const batch =
    (queryId && batches.find((b) => b.id === queryId)) ||
    (batches.length > 0 ? batches[0] : undefined);

  if (error || !batch) {
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              AI 永續報告 Demo
            </h1>
            <BackToFlow />
          </div>

          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
            {error
              ? `讀取失敗：${error.message}`
              : "目前 Supabase 中尚無任何批次資料，請先建立至少一筆示範批次。"}
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

  const totalCo2 = Number(batch.carbon || 0);
  const transportCo2 = totalCo2 * 0.35;
  const processCo2 = totalCo2 * 0.65;

  const transportShare =
    totalCo2 > 0 ? Math.round((transportCo2 / totalCo2) * 100) : 0;
  const processShare =
    totalCo2 > 0 ? Math.round((processCo2 / totalCo2) * 100) : 0;

  const recycleRate = 85;
  const savedCo2 = totalCo2 * 0.3;
  const mainSource = processCo2 >= transportCo2 ? "再生加工(處理廠)" : "運輸";

  const inputKg = Number(batch.kg || 0);
  const outputKg = Number(batch.processor?.output_kg || inputKg * 0.85);
  const wasteKg = Number(batch.processor?.waste_kg || inputKg * 0.15);
  const lossRate = inputKg > 0 ? Math.round((wasteKg / inputKg) * 100) : 0;

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
        <ReportWatermarkedShell
          demo={true}
          logoSrc="/brand/logo.png"
          opacity={0.07}
          rotateDeg={-18}
          maxWidthPercent={65}
        >
          <header style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                🤖 SustainAI – 循環經濟永續報告 Demo
              </h1>
              <BackToFlow />
            </div>

            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              此頁示範：如何根據 Supabase 批次數據，自動生成
              <b> ESG / GRI / ISSB 風格</b> 的報告文字。
            </p>

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

              <Link
                href={`/api/report/pdf-text?batch=${encodeURIComponent(
                  batch.id
                )}`}
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
              （運輸約 {transportShare}%、再生加工約 {processShare}%）。
              在回收投入 {inputKg.toFixed(1)} kg 的前提下，保守估計相較原生塑膠流程可
              <b> 減少約 {savedCo2.toFixed(2)} kg CO₂e</b>。整體
              <b> 再利用率約 {recycleRate.toFixed(1)}%</b>。
            </p>
          </section>

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
                本批次共投入回收塑膠材料 <b>{inputKg.toFixed(1)} kg</b>
                ，材質類型為「{batch.material}」。經處理後，輸出可再利用材料約
                <b> {outputKg.toFixed(1)} kg</b>，再生過程中產生報廢損耗約
                <b> {wasteKg.toFixed(1)} kg</b>（約占投入量的 {lossRate}%）。
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
                在本批次的再生處理過程中，回收材料經分類、清洗與再生造粒等程序，
                合計產生廢棄物約 <b>{wasteKg.toFixed(1)} kg</b>。
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
                本批次回收與再生活動的估算碳排放量為
                <b> {totalCo2.toFixed(2)} kg CO₂e</b>。若改採原生塑膠生產，
                相同產品批次之排放量預估將增加約
                <b> {savedCo2.toFixed(2)} kg CO₂e</b>。
              </p>
            </div>
          </section>

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
                本批次已展現具體循環材料使用與減碳潛力，可擴大至更多材料與產品線。
              </li>
              <li>
                建議持續蒐集運輸里程、用電來源、廢棄物去向，以提升估算準確性。
              </li>
              <li>
                正式導入 LLM 後，可擴充為完整 ESG 章節並一鍵匯出 PDF 報告。
              </li>
            </ul>
          </section>

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