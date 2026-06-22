"use client";

import { useState } from "react";

export default function ApproveButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/auditor/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          batchId,
          status: "approved",
          by: "ESG Auditor",
          note: "手動核准：流程資料已完成。",
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMsg(`更新失敗：${data.error || "unknown"} ${data.message || ""}`);
        return;
      }

      setMsg("核准成功，頁面即將更新");
      window.location.reload();
    } catch (err: any) {
      setMsg(`更新失敗：${err?.message || "network"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        onClick={approve}
        disabled={loading}
        style={{
          padding: "12px 22px",
          borderRadius: 16,
          border: "none",
          background: "#0f172a",
          color: "#fff",
          fontSize: 14,
          fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "核准中…" : "核准"}
      </button>

      {msg && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: msg.startsWith("更新失敗") ? "#dc2626" : "#16a34a",
          }}
        >
          {msg}
        </span>
      )}
    </div>
  );
}