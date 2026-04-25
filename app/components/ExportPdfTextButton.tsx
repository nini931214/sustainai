// app/components/ExportPdfTextButton.tsx
"use client";

export default function ExportPdfTextButton({ batchId }: { batchId?: string }) {
  const href = batchId
    ? `/api/report/pdf-text?batch=${encodeURIComponent(batchId)}`
    : `/api/report/pdf-text`;

  return (
    <button
      type="button"
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "white",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      匯出 PDF（文字版 + 浮水印）
    </button>
  );
}