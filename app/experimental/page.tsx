// app/experimental/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function ExperimentalPlaceholder() {
  const router = useRouter(); // ✅ hook 一定要在 component 裡

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          textAlign: "center",
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: 32,
          border: "1px dashed #cbd5f5",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          🧪 實驗模組（保留）
        </h1>

        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
          此模組為系統未來擴充功能，目前僅作為架構保留與流程示意。
          <br />
          後續將支援進階分析、模擬與跨批次實驗功能。
        </p>

        <div style={{ marginTop: 24 }}>
          <span
            onClick={() => router.push("/flow")}
            style={{
              color: "#2563eb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← 回流程總覽
          </span>
        </div>
      </div>
    </main>
  );
}