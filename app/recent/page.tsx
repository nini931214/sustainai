import Link from "next/link";
import { listBatches } from "@/lib/chain";
import BackToFlow from "../components/BackToFlow"; // 如果你的 recent 在 app/recent/page.tsx，這行通常是對的

export default function RecentPage() {
  const batches = listBatches();

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "32px 16px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* ✅ Header：左標題/說明，右按鈕 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              批次履歷清單（Batch Records）
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              顯示目前系統中的示範批次，可點擊進入詳細追溯頁。
            </p>
          </div>

          <BackToFlow />
        </div>

        <div
          style={{
            borderRadius: 16,
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
              <tr>
                <th style={{ padding: "10px 12px" }}>批次 ID</th>
                <th style={{ padding: "10px 12px" }}>材料</th>
                <th style={{ padding: "10px 12px" }}>重量 (kg)</th>
                <th style={{ padding: "10px 12px" }}>回收商</th>
                <th style={{ padding: "10px 12px" }}>審核狀態</th>
                <th style={{ padding: "10px 12px" }}>查看</th>
                <th style={{ padding: "10px 12px" }}>QR</th>
              </tr>
            </thead>

            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 12px" }}>{b.id}</td>
                  <td style={{ padding: "8px 12px" }}>{b.material}</td>
                  <td style={{ padding: "8px 12px" }}>{b.kg}</td>
                  <td style={{ padding: "8px 12px" }}>{b.recycler.name}</td>
                  <td style={{ padding: "8px 12px" }}>
                    {b.audit?.status ?? "pending"}
                  </td>

                  {/* 查看履歷 */}
                  <td style={{ padding: "8px 12px" }}>
                    <Link href={`/trace/${encodeURIComponent(b.id)}`}>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#2563eb",
                          cursor: "pointer",
                        }}
                      >
                        查看 →
                      </span>
                    </Link>
                  </td>

                  {/* QR Code */}
                  <td style={{ padding: "8px 12px" }}>
                    <Link href={`/qr/${encodeURIComponent(b.id)}`}>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#2563eb",
                          cursor: "pointer",
                        }}
                      >
                        QR →
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    尚無任何批次資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}