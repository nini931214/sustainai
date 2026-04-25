// app/dashboard/page.tsx
import { listBatches } from '@/lib/chain';
import { getBatchSummary } from '@/lib/summary';
import BackToFlow from "@/app/components/BackToFlow";

type Batch = any;

export default function DashboardPage() {
  const batches: Batch[] = listBatches();

  if (!batches || batches.length === 0) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#f5f7fb',
          padding: '32px 16px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            循環經濟儀表板
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
            目前尚無任何批次資料，請先從回收商入口建立至少一筆回收批次。
          </p>
          <BackToFlow />
        </div>
      </main>
    );
  }

  // === 聚合數據 ===
  let totalRecycledKg = 0;
  let totalSavedCo2 = 0;
  let reuseRatios: number[] = [];

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

    const summary = getBatchSummary(b);
    const fp = summary.footprint;
    const totalCo2 = fp.total_co2e || 0;
    const reuseRatio = fp.reuse_ratio;

    totalSavedCo2 += totalCo2 * 0.3; // 簡化假設：比原生塑膠少 30%

    if (reuseRatio != null && !Number.isNaN(reuseRatio)) {
      reuseRatios.push(reuseRatio);
    }

    const st = b.audit?.status || 'pending';
    if (statusCounts[st] == null) statusCounts[st] = 0;
    statusCounts[st] += 1;

    const key = String(b.material || 'Unknown');
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
    materials.length > 0
      ? Math.max(...materials.map((m) => m.totalKg))
      : 0;

  // 近期批次（按時間排序，取最新 5 筆）
  const recentBatches = [...batches]
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    .slice(0, 5);

  // 簡易 AI 洞察文字
  let aiSentence = '';
  if (materials.length > 0) {
    const topMaterial = materials.slice().sort((a, b) => b.totalKg - a.totalKg)[0];
    const approved = statusCounts.approved || 0;
    const total = batches.length;
    const approvedRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    aiSentence = `目前系統共記錄 ${batches.length} 筆回收批次，回收總量約 ${totalRecycledKg.toFixed(
      1,
    )} kg，其中以「${topMaterial.material}」為主。平均再利用率約 ${avgReuse.toFixed(
      1,
    )}% ，估計相較原生塑膠流程已節省約 ${totalSavedCo2.toFixed(
      1,
    )} kg CO₂e。稽核通過率約為 ${approvedRate}% ，顯示多數批次已符合基本永續與追溯要求。`;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fb',
        padding: '32px 16px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* 標題 */}
        <header style={{ marginBottom: 24 }}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
        SustainAI 循環經濟儀表板
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
        以回收塑膠再製電子產品外殼為案例，彙整回收站、處理廠、製造商與稽核方的資料，
        即時顯示循環利用績效與碳排放表現。
      </p>
    </div>

    <BackToFlow />
  </div>
</header>

        {/* KPI 區 */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="累計回收量"
            value={`${totalRecycledKg.toFixed(1)} kg`}
            desc="所有批次累計投入的回收塑膠重量"
          />
          <KpiCard
            label="平均再利用率"
            value={`${avgReuse.toFixed(1)} %`}
            desc="處理廠再生後可用重量占投入重量的比例"
          />
          <KpiCard
            label="估計節省碳排"
            value={`${totalSavedCo2.toFixed(1)} kg CO₂e`}
            desc="相較原生塑膠流程，保守估算的減碳量"
          />
        </section>

        {/* 狀態 & AI 洞察 */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.9fr)',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* 審核狀態卡 */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
              審核狀態一覽
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
              }}
            >
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

          {/* AI 洞察 */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#ecfeff',
              border: '1px solid #bae6fd',
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              🤖 AI 洞察（Summary）
            </h2>
            <p style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.8 }}>
              {aiSentence}
            </p>
            <p
              style={{
                fontSize: 11,
                color: '#6b7280',
                marginTop: 6,
              }}
            >
              備註：目前為規則與簡化係數計算示意。正式版本可改由 LLM 讀取 KPI 自動生成報告段落。
            </p>
          </div>
        </section>

        {/* 材料分布 + 近期批次 */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.6fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* 材料分布「水平長條圖」 */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              材料分布（依回收重量）
            </h2>
            {materials.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                目前尚無材料資料。
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {materials.map((m) => {
                  const percent =
                    maxMaterialKg > 0
                      ? Math.round((m.totalKg / maxMaterialKg) * 100)
                      : 0;
                  return (
                    <div key={m.material}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          marginBottom: 4,
                          color: '#4b5563',
                        }}
                      >
                        <span>{m.material}</span>
                        <span>
                          {m.totalKg.toFixed(1)} kg（{percent}%）
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            borderRadius: 999,
                            background:
                              'linear-gradient(90deg, #22c55e, #16a3b8)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 近期批次列表 */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              最近批次活動
            </h2>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 4px',
                      fontWeight: 500,
                    }}
                  >
                    批次 ID
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 4px',
                      fontWeight: 500,
                    }}
                  >
                    材料
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 4px',
                      fontWeight: 500,
                    }}
                  >
                    重量(kg)
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 4px',
                      fontWeight: 500,
                    }}
                  >
                    審核狀態
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 4px',
                      fontWeight: 500,
                    }}
                  >
                    建立時間
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentBatches.map((b) => {
                  const st = b.audit?.status || 'pending';
                  const created = b.ts
                    ? new Date(b.ts).toLocaleString()
                    : '—';
                  let color = '#6b7280';
                  if (st === 'approved') color = '#16a34a';
                  if (st === 'rejected') color = '#dc2626';

                  return (
                    <tr
                      key={b.id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
                      <td style={{ padding: '6px 4px' }}>{b.id}</td>
                      <td style={{ padding: '6px 4px' }}>{b.material}</td>
                      <td
                        style={{
                          padding: '6px 4px',
                          textAlign: 'right',
                        }}
                      >
                        {Number(b.kg || 0).toFixed(1)}
                      </td>
                      <td style={{ padding: '6px 4px', color }}>
                        {st === 'approved' && '通過'}
                        {st === 'rejected' && '退回'}
                        {st === 'pending' && '待審'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>{created}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* footer 小提示 */}
        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
          資料來源：回收商 / 處理廠 / 製造商 / 稽核方輸入的示範批次資料（data/chain.json）
        </p>
      </div>
    </main>
  );
}

function KpiCard(props: {
  label: string;
  value: string;
  desc: string;
}) {
  const { label, value, desc } = props;
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 25px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{desc}</div>
    </div>
  );
}

function StatusCard(props: {
  label: string;
  value: number;
  color: string;
}) {
  const { label, value, color } = props;
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
