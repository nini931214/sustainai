"use client";

import { useState } from "react";

export default function ApproveButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auditor/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId, // ✅ API 要的是 batchId，不是 id
          by: "ESG Auditor",
          note: "樣本資料：審計方已覆核此批次。",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setMsg(`更新失敗：${data?.error || "unknown"}`);
      } else {
        setMsg(`✅ 已核准：${batchId}`);
        // 直接刷新頁面，讓 trace 重新讀 chain/reports/versions
        window.location.reload();
      }
    } catch {
      setMsg("更新失敗：network");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <button
        type="button"
        disabled={loading}
        onClick={approve}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: "#0f172a",
          color: "#fff",
          fontSize: 13,
          fontWeight: 900,
          cursor: "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "核准中…" : "核准"}
      </button>

      {msg ? (
        <div style={{ fontSize: 12, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}