// app/trace/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackToFlow from "../components/BackToFlow";

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#f8fafc, #ffffff)",
  padding: "32px 16px",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  margin: 0,
  color: "#0f172a",
};

const subTitleStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  lineHeight: 1.6,
  color: "#64748b",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "1fr",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  padding: 20,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "#64748b",
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  color: "#0f172a",
  boxSizing: "border-box",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const buttonOutlineStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const smallHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  lineHeight: 1.6,
};

export default function TraceIndexPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // 支援：/trace?batchId=... 或 /trace?reportId=...
  const initialBatchId = useMemo(
    () => (sp.get("batchId") || "BATCH-2026-006").trim(),
    [sp]
  );
  const initialReportId = useMemo(
    () => (sp.get("reportId") || "RPT-001").trim(),
    [sp]
  );

  const [batchId, setBatchId] = useState(initialBatchId);
  const [reportId, setReportId] = useState(initialReportId);

  function goTrace() {
    const id = batchId.trim();
    if (!id) return;
    router.push(`/trace/${encodeURIComponent(id)}`);
  }

  function goVerify() {
    const id = reportId.trim();
    if (!id) return;
    router.push(`/verify?reportId=${encodeURIComponent(id)}`);
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerRowStyle}>
          <div>
            <h1 style={titleStyle}>追蹤／查詢</h1>
            <div style={subTitleStyle}>
              依批次或報告編號，查詢循環供應鏈履歷與報告真偽（防篡改）。
            </div>
          </div>
          <BackToFlow />
        </div>

        {/* Cards */}
        <div style={gridStyle}>
          {/* A: Batch Trace */}
          <section style={cardStyle}>
            <div style={cardTitleStyle}>🔍 批次履歷查詢</div>
            <div style={cardDescStyle}>
              查看回收 → 處理 → 製造 → 稽核之流程摘要（公開追溯頁）。
            </div>

            <div style={rowStyle}>
              <input
                style={{ ...inputStyle, flex: "1 1 320px" }}
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                placeholder="例如：BATCH-2026-006"
                onKeyDown={(e) => {
                  if (e.key === "Enter") goTrace();
                }}
              />

              <button type="button" style={buttonPrimaryStyle} onClick={goTrace}>
                查詢批次履歷
              </button>

              <button
                type="button"
                style={buttonOutlineStyle}
                onClick={() => router.push(`/trace/BATCH-2026-006`)}
              >
                示範批次
              </button>
            </div>

            <div style={{ marginTop: 10, ...smallHintStyle }}>
              ※ 你也可以從「批次履歷清單 / QR」點進來，這裡則是給外部快速查詢的入口。
            </div>
          </section>

          {/* B: Report Verify */}
          <section style={cardStyle}>
            <div style={cardTitleStyle}>🔐 報告驗證</div>
            <div style={cardDescStyle}>
              驗證永續報告是否與核准版本一致，並顯示 ✅/❌ 與原因（防篡改驗證）。
            </div>

            <div style={rowStyle}>
              <input
                style={{ ...inputStyle, flex: "1 1 320px" }}
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                placeholder="例如：RPT-001"
                onKeyDown={(e) => {
                  if (e.key === "Enter") goVerify();
                }}
              />

              <button type="button" style={buttonPrimaryStyle} onClick={goVerify}>
                驗證報告
              </button>

              <button
                type="button"
                style={buttonOutlineStyle}
                onClick={() => router.push(`/verify?reportId=RPT-001`)}
              >
                示範報告
              </button>
            </div>

            <div style={{ marginTop: 10, ...smallHintStyle }}>
              ※ 之後你也可以把「下載 PDF」的 QR 直接帶 reportId，外部掃一下就能驗真偽。
            </div>
          </section>

          {/* Trust block */}
          <section
            style={{
              borderRadius: 18,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
              為什麼可信？
            </div>
            <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, color: "#334155" }}>
              <li style={{ fontSize: 13, lineHeight: 1.8 }}>
                資料內容以 <b>Hash</b> 計算，改一個字就不一致
              </li>
              <li style={{ fontSize: 13, lineHeight: 1.8 }}>
                核准版本串成 <b>版本鏈（Chain）</b>，可追溯、不可逆
              </li>
              <li style={{ fontSize: 13, lineHeight: 1.8 }}>
                支援 <b>公鑰驗章</b>（第三方也能驗）
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}