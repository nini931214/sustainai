// app/dashboard/page.tsx
import { createClient } from "@supabase/supabase-js";
import BackToFlow from "@/app/components/BackToFlow";

export const dynamic = "force-dynamic";

type Batch = {
  id: string;
  material: string;
  kg: number;
  carbon: number;
  ts: number;
  created_at?: string;
  company?: string;
  role?: string;
  audit: {
    status: "approved" | "rejected" | "pending";
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

function normalizeBatch(row: any): Batch {
  return {
    id: row.id,
    material: row.material || "Unknown",
    kg: Number(row.quantity || 0),
    carbon: Number(row.carbon || 0),
    ts: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    created_at: row.created_at,
    company: row.company || "未登錄",
    role: row.role || "-",
    audit: {
      status:
        row.status === "approved"
          ? "approved"
          : row.status === "rejected"
          ? "rejected"
          : "pending",
    },
  };
}

export default async function DashboardPage() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  const batches: Batch[] = (data ?? []).map(normalizeBatch);

  if (error || batches.length === 0) {
    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            循環經濟儀表板
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
            {error
              ? `讀取失敗：${error.message}`
              : "目前尚無任何批次資料，請先從回收商入口建立至少一筆回收批次。"}
          </p>
          <BackToFlow />
        </div>
      </main>
    );
  }

  let totalRecycledKg = 0;
  let totalSavedCo2 = 0;
  const reuseRatios: number[] = [];

  const statusCounts: Record<string, number> = {
    approved: 0,
    rejected: 0,
    pending: 0,
  };

  const materialMap = new Map<
    string,
    { material: string; totalKg: number; count: number }
  >();

  batches.forEach((b) => {
    totalRecycledKg += Number(b.kg || 0);

    const totalCo2 = Number(b.carbon || Number(b.kg || 0) * 0.12);
    const reuseRatio = 0.85;

    totalSavedCo2 += totalCo2 * 0.3;
    reuseRatios.push(reuseRatio);

    const st = b.audit?.status || "pending";
    if (statusCounts[st] == null) statusCounts[st] = 0;
    statusCounts[st] += 1;

    const key = String(b.material || "Unknown");
    if (!materialMap.has(key)) {
      materialMap.set(key, { material: key, totalKg: 0, count: 0 });
    }

    const m = materialMap.get(key)!;
    m.totalKg += Number(b.kg || 0);
    m.count += 1;
  });

  const avgReuse =
    reuseRatios.length > 0
      ? (reuseRatios.reduce((a, b) => a + b, 0) / reuseRatios.length) * 100
      : 0;

  const materials = Array.from(materialMap.values());
  const maxMaterialKg =
    materials.length > 0 ? Math.max(...materials.map((m) => m.totalKg)) : 0;

  const recentBatches = [...batches]
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    .slice(0, 5);

  const topMaterial = materials
    .slice()
    .sort((a, b) => b.totalKg - a.totalKg)[0];

  const approved = statusCounts.approved || 0;
  const approvedRate =
    batches.length > 0 ? Math.round((approved / batches.length) * 100) : 0;

  const aiSentence = `目前系統共記錄 ${
    batches.length
  } 筆回收批次，回收總量約 ${totalRecycledKg.toFixed(
    1
  )} kg，其中以「${
    topMaterial?.material || "Unknown"
  }」為主。平均再利用率約 ${avgReuse.toFixed(
    1
  )}% ，估計相較原生塑膠流程已節省約 ${totalSavedCo2.toFixed(
    1
  )} kg CO₂e。稽核通過率約為 ${approvedRate}% 。`;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={headerRowStyle}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                SustainAI 循環經濟儀表板
              </h1>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                以 Supabase 資料表即時彙整回收站、處理廠、製造商與稽核方的資料。
              </p>
            </div>

            <BackToFlow />
          </div>
        </header>

        <section style={kpiGridStyle}>
          <KpiCard
            label="累計回收量"
            value={`${totalRecycledKg.toFixed(1)} kg`}
            desc="所有批次累計投入的回收塑膠重量"
          />
          <KpiCard
            label="平均再利用率"
            value={`${avgReuse.toFixed(1)} %`}
            desc="示範估算的再利用比例"
          />
          <KpiCard
            label="估計節省碳排"
            value={`${totalSavedCo2.toFixed(1)} kg CO₂e`}
            desc="相較原生塑膠流程的保守估算減碳量"
          />
        </section>

        <section style={statusGridStyle}>
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>審核狀態一覽</h2>
            <div style={statusCardsStyle}>
              <StatusCard
                label="通過"
                value={statusCounts.approved || 0}
                color="#16a34a"
              />
              <StatusCard
                label="退回"
                value={statusCounts.rejected || 0}
                color="#dc2626"
              />
              <StatusCard
                label="待審"
                value={statusCounts.pending || 0}
                color="#6b7280"
              />
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: "#ecfeff",
              border: "1px solid #bae6fd",
            }}
          >
            <h2 style={cardTitleStyle}>🤖 AI 洞察（Summary）</h2>
            <p style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.8 }}>
              {aiSentence}
            </p>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
              備註：目前為規則與簡化係數計算示意。正式版本可改由 LLM 讀取 KPI 自動生成報告段落。
            </p>
          </div>
        </section>

        <section style={mainGridStyle}>
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>材料分布（依回收重量）</h2>

            {materials.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                目前尚無材料資料。
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.map((m) => {
                  const percent =
                    maxMaterialKg > 0
                      ? Math.round((m.totalKg / maxMaterialKg) * 100)
                      : 0;

                  return (
                    <div key={m.material}>
                      <div style={barLabelStyle}>
                        <span>{m.material}</span>
                        <span>
                          {m.totalKg.toFixed(1)} kg（{percent}%）
                        </span>
                      </div>
                      <div style={barTrackStyle}>
                        <div style={{ ...barFillStyle, width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>最近批次活動</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={thLeft}>批次 ID</th>
                  <th style={thLeft}>材料</th>
                  <th style={thRight}>重量(kg)</th>
                  <th style={thLeft}>審核狀態</th>
                  <th style={thLeft}>建立時間</th>
                </tr>
              </thead>

              <tbody>
                {recentBatches.map((b) => {
                  const st = b.audit?.status || "pending";
                  const created = b.ts ? new Date(b.ts).toLocaleString() : "—";

                  let color = "#6b7280";
                  if (st === "approved") color = "#16a34a";
                  if (st === "rejected") color = "#dc2626";

                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={tdLeft}>{b.id}</td>
                      <td style={tdLeft}>{b.material}</td>
                      <td style={tdRight}>{Number(b.kg || 0).toFixed(1)}</td>
                      <td style={{ ...tdLeft, color }}>
                        {st === "approved" && "通過"}
                        {st === "rejected" && "退回"}
                        {st === "pending" && "待審"}
                      </td>
                      <td style={tdLeft}>{created}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
          資料來源：Supabase batches 資料表
        </p>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f5f7fb",
  padding: "32px 16px",
  boxSizing: "border-box",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const statusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.9fr)",
  gap: 16,
  marginBottom: 20,
};

const mainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.6fr)",
  gap: 16,
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 8,
};

const statusCardsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const barLabelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  marginBottom: 4,
  color: "#4b5563",
};

const barTrackStyle: React.CSSProperties = {
  width: "100%",
  height: 10,
  borderRadius: 999,
  backgroundColor: "#e5e7eb",
  overflow: "hidden",
};

const barFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #22c55e, #16a3b8)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thLeft: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 4px",
  fontWeight: 500,
};

const thRight: React.CSSProperties = {
  textAlign: "right",
  padding: "6px 4px",
  fontWeight: 500,
};

const tdLeft: React.CSSProperties = {
  padding: "6px 4px",
};

const tdRight: React.CSSProperties = {
  padding: "6px 4px",
  textAlign: "right",
};

function KpiCard(props: { label: string; value: string; desc: string }) {
  const { label, value, desc } = props;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div>
    </div>
  );
}

function StatusCard(props: { label: string; value: number; color: string }) {
  const { label, value, color } = props;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#f9fafb",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}