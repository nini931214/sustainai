"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackToFlow from "../components/BackToFlow";

type BatchData = {
  batchId: string;
  recyclerName: string;
  recyclerKm: number;
  recyclerWeightKg: number;
  recyclerEnergyKwh: number;
  processorName?: string;
  yieldRate?: number;
  processorEnergyKwh?: number;
  manufacturerName?: string;
  sku?: string;
  lot?: string;
};

type AuditStatus = "pending" | "approved" | "rejected";

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f5f7fb",
  padding: "32px 16px",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1120px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  padding: 20,
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const badgeStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  backgroundColor: "#eef2ff",
  color: "#4338ca",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  boxSizing: "border-box",
};

const smallTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  backgroundColor: "#111827",
  color: "#ffffff",
};

const buttonOutlineStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  backgroundColor: "#ffffff",
  color: "#111827",
};

const kpiBarWrapper: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#e5e7eb",
  borderRadius: 999,
  overflow: "hidden",
  height: 8,
};

const kpiBar: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(34,197,94,1) 0%, rgba(59,130,246,1) 50%, rgba(249,115,22,1) 100%)",
};

function normalizeBatch(row: any): BatchData {
  return {
    batchId: row.id,
    recyclerName: row.company || "Recycler",
    recyclerKm: 0,
    recyclerWeightKg: Number(row.quantity || 0),
    recyclerEnergyKwh: 0,
    processorName:
      row.status === "processed" || row.status === "manufactured"
        ? row.company || "Processor"
        : undefined,
    yieldRate: 0.9,
    processorEnergyKwh: Number(row.carbon || 0),
    manufacturerName:
      row.status === "manufactured" ? row.company || "Manufacturer" : undefined,
    sku: row.sku || "",
    lot: row.lot || "",
  };
}

function generateEsgScore(data: BatchData | null): number {
  if (!data) return 0;
  let score = 80;
  if (data.recyclerKm > 200) score -= 10;
  if ((data.yieldRate ?? 1) < 0.7) score -= 10;
  if ((data.processorEnergyKwh ?? 0) > 100) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function generateAuditSummary(data: BatchData | null, score: number): string {
  if (!data) return "尚未載入任何批次資料。";

  if (score >= 85) {
    return `本批次（${data.batchId}）供應鏈資料完整，已成功從 Supabase 載入批次資料，ESG 指標表現良好，建議審核通過。`;
  }
  if (score >= 70) {
    return `本批次（${data.batchId}）整體表現中等，建議追蹤運輸距離與能源使用，仍可視為合格批次。`;
  }
  return `本批次（${data.batchId}）在 ESG 指標上存在明顯風險，建議暫緩通過並要求補件。`;
}

function AuditorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId") || "";

  const [inputBatchId, setInputBatchId] = useState(initialBatchId);
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditStatus, setAuditStatus] = useState<AuditStatus>("pending");

  useEffect(() => {
    if (initialBatchId) {
      handleLoad(initialBatchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoad(bid?: string) {
    const targetId = (bid ?? inputBatchId).trim();
    if (!targetId) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/recent?limit=100`, {
        cache: "no-store",
      });

      const json = await res.json();
      const rows = json.items || json.batches || [];

      const found = rows.find(
        (r: any) => String(r.id) === targetId || String(r.batchId) === targetId
      );

      if (!found) {
        alert("找不到批次，請確認批次 ID 是否正確。");
        setBatch(null);
        return;
      }

      setBatch(normalizeBatch(found));
      setAuditStatus("pending");

      router.replace(`/auditor?batchId=${encodeURIComponent(targetId)}`);
    } catch (err) {
      console.error("Auditor load error:", err);
      alert("載入失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    setAuditStatus("approved");
  }

  function handleReject() {
    setAuditStatus("rejected");
  }

  const esgScore = generateEsgScore(batch);
  const summary = generateAuditSummary(batch, esgScore);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
              ♻️ 循環經濟原型設計
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>
              稽核方（Auditor）— ESG 專業審核台
            </h1>
            <p style={{ ...smallTextStyle, marginTop: 4 }}>
              可由 QR 連結或手動輸入批次 ID，從 Supabase 載入批次資料，再決定是否通過。
            </p>
          </div>
          <BackToFlow />
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              選擇批次（From QR / ID）
            </div>
            <span style={badgeStyle}>Step 1 · 載入批次資料</span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ flex: "1 1 220px" }}>
              <div style={labelStyle}>批次 ID（Batch ID）</div>
              <input
                style={inputStyle}
                value={inputBatchId}
                onChange={(e) => setInputBatchId(e.target.value)}
                placeholder="例如：BATCH-2026-1234"
              />
            </div>

            <button
              style={buttonPrimaryStyle}
              onClick={() => handleLoad()}
              disabled={loading}
            >
              {loading ? "載入中…" : "載入批次"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div style={{ ...cardStyle, flex: "1 1 260px", minWidth: 260 }}>
            <div style={cardHeaderStyle}>
              <div style={sectionTitleStyle}>♻️ 回收商（Recycler）</div>
            </div>
            {batch ? (
              <>
                <div style={labelStyle}>回收商 / 公司名稱</div>
                <div style={valueStyle}>{batch.recyclerName}</div>

                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle}>運輸里程（km）</div>
                  <div style={valueStyle}>{batch.recyclerKm} km</div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle}>重量（kg）</div>
                  <div style={valueStyle}>{batch.recyclerWeightKg} kg</div>
                </div>
              </>
            ) : (
              <p style={smallTextStyle}>尚未載入批次資料。</p>
            )}
          </div>

          <div style={{ ...cardStyle, flex: "1 1 260px", minWidth: 260 }}>
            <div style={cardHeaderStyle}>
              <div style={sectionTitleStyle}>🏭 處理廠（Processor）</div>
            </div>
            {batch ? (
              <>
                <div style={labelStyle}>處理廠名稱</div>
                <div style={valueStyle}>{batch.processorName ?? "尚未處理"}</div>

                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle}>材料利用率（yield）</div>
                  <div style={valueStyle}>
                    {batch.yieldRate != null
                      ? `${(batch.yieldRate * 100).toFixed(1)}%`
                      : "—"}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle}>估計處理碳排</div>
                  <div style={valueStyle}>
                    {batch.processorEnergyKwh != null
                      ? `${batch.processorEnergyKwh} kg CO₂e`
                      : "—"}
                  </div>
                </div>
              </>
            ) : (
              <p style={smallTextStyle}>尚未載入批次資料。</p>
            )}
          </div>

          <div style={{ ...cardStyle, flex: "1 1 260px", minWidth: 260 }}>
            <div style={cardHeaderStyle}>
              <div style={sectionTitleStyle}>🏗️ 製造商（Manufacturer）</div>
            </div>
            {batch ? (
              <>
                <div style={labelStyle}>製造商名稱</div>
                <div style={valueStyle}>
                  {batch.manufacturerName ?? "尚未製造"}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle}>SKU</div>
                  <div style={valueStyle}>{batch.sku || "—"}</div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={labelStyle}>LOT</div>
                  <div style={valueStyle}>{batch.lot || "—"}</div>
                </div>
              </>
            ) : (
              <p style={smallTextStyle}>尚未載入批次資料。</p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div style={{ ...cardStyle, flex: "1 1 280px", minWidth: 260 }}>
            <div style={cardHeaderStyle}>
              <div style={sectionTitleStyle}>📊 ESG KPI 概覽</div>
              <span style={badgeStyle}>AI Score</span>
            </div>

            {batch ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={labelStyle}>綜合 ESG 評分</div>
                  <div
                    style={{
                      ...valueStyle,
                      fontSize: 26,
                      marginBottom: 6,
                    }}
                  >
                    {esgScore} / 100
                  </div>
                  <div style={kpiBarWrapper}>
                    <div style={{ ...kpiBar, width: `${esgScore}%` }} />
                  </div>
                </div>

                <ul
                  style={{
                    marginTop: 10,
                    paddingLeft: 18,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  <li>材料重量：{batch.recyclerWeightKg} kg</li>
                  <li>
                    材料利用率：
                    {batch.yieldRate != null
                      ? `${(batch.yieldRate * 100).toFixed(1)}%`
                      : "—"}
                  </li>
                  <li>估計碳排：{batch.processorEnergyKwh ?? 0} kg CO₂e</li>
                </ul>
              </>
            ) : (
              <p style={smallTextStyle}>尚未載入批次資料。</p>
            )}
          </div>

          <div style={{ ...cardStyle, flex: "1 1 320px", minWidth: 280 }}>
            <div style={cardHeaderStyle}>
              <div style={sectionTitleStyle}>🧠 AI ESG 審核摘要</div>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "#111827",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {summary}
            </p>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                style={{
                  ...buttonPrimaryStyle,
                  backgroundColor:
                    auditStatus === "approved" ? "#16a34a" : "#111827",
                }}
                onClick={handleApprove}
              >
                ✅ 審核通過
              </button>

              <button
                style={{
                  ...buttonOutlineStyle,
                  borderColor: "#f97316",
                  color: "#b45309",
                }}
                onClick={handleReject}
              >
                ❌ 不通過
              </button>

              <span style={{ ...smallTextStyle, marginLeft: 4 }}>
                目前狀態：
                {auditStatus === "pending"
                  ? "待審核"
                  : auditStatus === "approved"
                  ? "已通過"
                  : "已退回"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditorPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading...</main>}>
      <AuditorPageInner />
    </Suspense>
  );
}