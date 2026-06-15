// app/qr/[batchId]/page.tsx
import Link from "next/link";
import QrActions from "./QrActions";
import BackToFlow from "../../components/BackToFlow";
import { getBatchById } from "@/lib/chain";

export const dynamic = "force-dynamic";

export default async function QrLabelPage({
  params,
}: {
  params: { batchId: string };
}) {
  const id = decodeURIComponent(params.batchId);
  const batch = await getBatchById(id);

  const tracePath = `/trace/${encodeURIComponent(id)}`;
 const qrImageUrl = `/qr/${encodeURIComponent(id)}/image?v=prod-fixed-1`;

  const material = batch?.material ?? "—";
  const kg = batch?.kg ?? batch?.weight ?? "—";

  const recyclerName =
    batch?.recycler?.name ??
    (typeof batch?.recycler === "string" ? batch.recycler : "—");

  const auditStatus = batch?.audit?.status ?? batch?.status ?? "pending";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(#f8fafc, #ffffff)",
        padding: "32px 16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              批次 QR 標籤
            </h1>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              可列印貼在產品、箱標或出貨文件上（掃描後進入公開履歷頁）。
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <BackToFlow />
            <QrActions qrImageUrl={qrImageUrl} batchId={id} />
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            padding: 22,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
            批次 QR 標籤
          </div>

          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
            <div>
              批次 ID：<b>{id}</b>
            </div>
            <div>
              掃描後會前往此批次的公開履歷頁：<code>{tracePath}</code>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "420px 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div
              style={{
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                padding: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 14,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  padding: 14,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img
                  src={qrImageUrl}
                  alt={`QR for ${id}`}
                  style={{
                    width: 320,
                    height: 320,
                    imageRendering: "pixelated",
                  }}
                />
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                建議印在產品標籤或出貨單上供掃描。
              </div>

              <div style={{ marginTop: 10 }}>
                <Link href={tracePath}>
                  <span
                    style={{
                      color: "#0f766e",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    前往批次履歷 →
                  </span>
                </Link>
              </div>
            </div>

            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                使用說明
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.8,
                }}
              >
                <li>將此 QR 貼在產品、箱標或出貨文件上。</li>
                <li>客戶或稽核方掃描後，會看到回收 → 處理 → 製造 → 稽核的履歷摘要。</li>
                <li>QR Code 會導向正式網站的批次公開履歷頁。</li>
              </ul>

              <div
                style={{
                  marginTop: 14,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                  批次資訊（快速核對）
                </div>

                {!batch ? (
                  <div style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.7 }}>
                    找不到批次資料。請確認此批次是否已寫入 Supabase：<code>batches</code>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.9 }}>
                    <div>
                      材料：<b>{String(material)}</b>
                    </div>
                    <div>
                      重量：<b>{String(kg)}</b> kg
                    </div>
                    <div>
                      回收商：<b>{String(recyclerName)}</b>
                    </div>
                    <div>
                      稽核狀態：<b>{String(auditStatus)}</b>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/qr">
                  <span style={btnStyle}>← 回 QR 查詢</span>
                </Link>

                <Link href="/recent">
                  <span style={btnStyle}>回批次清單</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>
          註：下載功能只下載 QR PNG 圖檔（不含整頁 UI）。
        </div>
      </div>
    </main>
  );
}

const btnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
};