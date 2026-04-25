"use client";

import BackToFlow from "../components/BackToFlow"; // 路徑依頁面位置調整
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QrEntryPage() {
  const router = useRouter();
  const [batchId, setBatchId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => batchId.trim(), [batchId]);

  function go() {
    const id = trimmed;
    if (!id) {
      setError("請輸入批次 ID（例如：BATCH-2025-001）");
      return;
    }
    setError(null);
    router.push(`/qr/${encodeURIComponent(id)}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(#f8fafc, #ffffff)",
        padding: "32px 16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* ✅ 只新增這塊：回流程總覽（其它內容不動） */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div />
          <BackToFlow />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          QR 履歷查詢
        </h1>

        <div
          style={{
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.7,
            marginBottom: 18,
          }}
        >
          請輸入批次 ID，進入「批次 QR 標籤」頁（可下載 QR PNG）。
        </div>

        <div
          style={{
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            padding: 18,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
              }}
              placeholder="例如：BATCH-2025-001"
              style={{
                flex: "1 1 320px",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              onClick={go}
              disabled={!trimmed}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: trimmed ? "#0f172a" : "#94a3b8",
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: trimmed ? "pointer" : "not-allowed",
              }}
            >
              前往 QR 標籤 →
            </button>

            <Link href="/recent" style={{ textDecoration: "none" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                回批次清單
              </span>
            </Link>
          </div>

          {error && (
            <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}