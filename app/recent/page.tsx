import Link from "next/link";
import BackToFlow from "../components/BackToFlow";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export default async function RecentPage() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  const batches = data ?? [];

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "32px 16px", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              批次履歷清單（Batch Records）
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              顯示 Supabase 中最新建立的批次，可點擊進入詳細追溯頁。
            </p>
          </div>

          <BackToFlow />
        </div>

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13 }}>
            讀取失敗：{error.message}
          </p>
        )}

        <div style={{ borderRadius: 16, backgroundColor: "#ffffff", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
              <tr>
                <th style={{ padding: "10px 12px" }}>批次 ID</th>
                <th style={{ padding: "10px 12px" }}>材料</th>
                <th style={{ padding: "10px 12px" }}>重量 (kg)</th>
                <th style={{ padding: "10px 12px" }}>公司 / 角色</th>
                <th style={{ padding: "10px 12px" }}>狀態</th>
                <th style={{ padding: "10px 12px" }}>查看</th>
                <th style={{ padding: "10px 12px" }}>QR</th>
              </tr>
            </thead>

            <tbody>
              {batches.map((b: any) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 12px" }}>{b.id}</td>
                  <td style={{ padding: "8px 12px" }}>{b.material ?? "-"}</td>
                  <td style={{ padding: "8px 12px" }}>{b.quantity ?? "-"}</td>
                  <td style={{ padding: "8px 12px" }}>
                    {b.company ?? "未登錄"} / {b.role ?? "-"}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{b.status ?? "pending"}</td>

                  <td style={{ padding: "8px 12px" }}>
                    <Link href={`/trace/${encodeURIComponent(b.id)}`} style={{ fontSize: 13, color: "#2563eb" }}>
                      查看 →
                    </Link>
                  </td>

                  <td style={{ padding: "8px 12px" }}>
                    <Link href={`/qr/${encodeURIComponent(b.id)}`} style={{ fontSize: 13, color: "#2563eb" }}>
                      QR →
                    </Link>
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "12px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>
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