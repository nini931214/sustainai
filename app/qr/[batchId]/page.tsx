// app/qr/[batchId]/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import QrActions from "./QrActions";
import BackToFlow from "../../components/BackToFlow"; // 路徑依頁面位置調整

// 在 return 的 header 區塊裡
<div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
  <div>{/* 原本標題 */}</div>
  <BackToFlow />
</div>

type TraceResponse = {
  batch?: {
    id: string;
    material?: string;
    kg?: number;
    recycler?: any;
    processor?: any;
    manufacturer?: any;
    audit?: { status?: string };
  };
  footprint?: {
    total_co2e?: number;
    transport_co2e?: number;
    process_co2e?: number;
  };
};

function getBaseUrlFromHeaders() {
  const h = headers();
  const host = h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  // fallback（理論上 dev 一定有 host）
  if (!host) return "";

  return `${proto}://${host}`;
}

export default async function QrLabelPage({
  params,
}: {
  params: { batchId: string };
}) {
  const id = decodeURIComponent(params.batchId);

  // ✅ Server Component: 用 headers 組絕對網址最穩
  const baseUrl = getBaseUrlFromHeaders();
  const apiUrl = `${baseUrl}/api/trace/${encodeURIComponent(id)}`;

  let data: TraceResponse | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });

    if (!res.ok) {
      fetchError = `API 回應失敗：${res.status} ${res.statusText}`;
    } else {
      data = (await res.json()) as TraceResponse;
    }
  } catch (e: any) {
    fetchError = `API 連線失敗：${e?.message ?? "unknown error"}`;
  }

 // ✅ 容錯：兼容 /api/trace 可能回傳的不同格式
const anyData: any = data;

// 可能的回傳格式：
// 1) { batch: {...} }
// 2) { ok: true, record: {...} }   （record 本身就是 batch）
// 3) { ok: true, record: { batch: {...} } }
const batch =
  anyData?.batch ??
  anyData?.record?.batch ??
  anyData?.record ??
  null;

  const tracePath = `/trace/${encodeURIComponent(id)}`;
  const qrImageUrl = `/qr/${encodeURIComponent(id)}/image`;

  const material = batch?.material ?? "—";
  const kg = batch?.kg ?? "—";
  const recyclerName =
    batch?.recycler?.name ??
    (typeof batch?.recycler === "string" ? batch?.recycler : "—");
  const auditStatus = batch?.audit?.status ?? "pending";

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
        {/* Top header */}
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

          {/* 右上按鈕：只保留下載 PNG */}
          <QrActions qrImageUrl={qrImageUrl} batchId={id} />
        </div>

        {/* Card */}
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
            {/* Left: QR */}
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

            {/* Right: instructions + quick info */}
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
                <li>
                  客戶或稽核方掃描後，會看到回收 → 處理 → 製造 → 稽核的履歷摘要。
                </li>
                <li>正式上線後只要維持網址規則一致即可沿用。</li>
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
                <div
                  style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}
                >
                  批次資訊（快速核對）
                </div>

                {!batch ? (
                  <div style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.7 }}>
                    找不到批次資料（但 QR 仍可用）。<br />
                    <div style={{ marginTop: 6, color: "#0f172a" }}>
                      目前 API URL：<code>{apiUrl}</code>
                    </div>
                    {fetchError ? (
                      <div style={{ marginTop: 6 }}>
                        錯誤：<code>{fetchError}</code>
                      </div>
                    ) : (
                      <div style={{ marginTop: 6 }}>
                        請確認此 API 是否能回傳 <code>{`{"batch": ...}`}</code>
                      </div>
                    )}
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
                  <span
                    style={{
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
                    }}
                  >
                    ← 回 QR 查詢
                  </span>
                </Link>

                <Link href="/recent">
                  <span
                    style={{
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
                    }}
                  >
                    回批次清單
                  </span>
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