import AutoDemoButton from "./AutoDemoButton";

export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

// === 檔案路徑 ===
const TOKEN_PATH = path.join(process.cwd(), "data", "tokens.json");
const LEDGER_PATH = path.join(process.cwd(), "data", "ledger.json");

type Token = {
  tokenId: string;
  batchId: string;
  material: string;
  weightKg: number;
  recycler?: string;
  processor?: string;
  manufacturer?: string;
  status: "minted" | "processed" | "used";
  issuedAt?: string;
  processedAt?: string;
  usedAt?: string;
};

type Ledger = Record<string, number>;

// === 主頁面 ===
export default async function FlowPage({
  params,
}: {
  params: { batch: string };
}) {
  const batchId = params.batch;

  // 讀取 tokens.json
  const rawTokens = await fs.readFile(TOKEN_PATH, "utf8").catch(() => "[]");
  const tokens: Token[] = JSON.parse(rawTokens || "[]").filter(
    (t: any) => t.batchId === batchId
  );

  // 讀取 ledger.json
  const rawLedger = await fs.readFile(LEDGER_PATH, "utf8").catch(() => "{}");
  const ledger: Ledger = JSON.parse(rawLedger || "{}");

  return (
    <main style={{ padding: "24px 40px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
        Multi-Role Console — {batchId}
      </h1>
      <p>
        🔗 <Link href={`/trace/${batchId}`}>查看鏈上時間線</Link>
      </p>

      {/* ========== 區塊 1：處理廠與製造商表單 ========== */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "40px",
          marginTop: 30,
        }}
      >
        {/* 處理廠 */}
        <section style={{ flex: 1, minWidth: 320 }}>
          <h2>🏭 處理廠（Process Token）</h2>
          <ol style={{ fontSize: 13, marginBottom: 10, opacity: 0.8 }}>
            <li>1️⃣ 從下方 Tokens 複製一個 Token ID</li>
            <li>2️⃣ 填上處理廠資訊與參數</li>
            <li>3️⃣ 可勾選「自動 Use」同時讓製造商使用</li>
          </ol>
          <form
            id="processForm"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "#f9fafb",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <input placeholder="Token ID（從下方複製）" />
            <input placeholder="處理廠名稱（EcoFactory）" />
            <input placeholder="產率 yieldRate（0.9）" />
            <input placeholder="耗能 energyKwh（30）" />
            <label>
              <input type="checkbox" /> 處理完成後自動 Use（同時製造）
            </label>
            <h4>製造商資訊（如自動 Use 時需填）</h4>
            <input placeholder="製造商名稱（RenewTech）" />
            <input placeholder="SKU（RB-100）" />
            <input placeholder="LOT（L202510）" />
            <button type="button">→ Process & Auto-Use</button>
          </form>
        </section>

        {/* 製造商 */}
        <section style={{ flex: 1, minWidth: 320 }}>
          <h2>🏗️ 製造商（Use Token）</h2>
          <ol style={{ fontSize: 13, marginBottom: 10, opacity: 0.8 }}>
            <li>1️⃣ 選擇已 processed 的 Token</li>
            <li>2️⃣ 填入製造商名稱與產品批次</li>
          </ol>
          <form
            id="useForm"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "#f9fafb",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <input placeholder="Token ID（必須已 processed）" />
            <input placeholder="製造商名稱（RenewTech）" />
            <input placeholder="SKU（RB-200）" />
            <input placeholder="LOT（L20251028）" />
            <button type="button">→ Use</button>
          </form>
        </section>
      </div>

      {/* ========== 區塊 2：Token 狀態表 ========== */}
      <hr style={{ margin: "30px 0" }} />
      <h2>♻️ Tokens（此批次）</h2>

      {tokens.length === 0 ? (
        <p>
          目前尚無 Token，請先到{" "}
          <Link href={`/admin/recycler`}>回收站頁面</Link> 上傳一筆資料，或使用下方一鍵示範自動建立。
        </p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            marginTop: 10,
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Token ID</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Material</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Kg</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Recycler</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Processor</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>
                Manufacturer
              </th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.tokenId}>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.tokenId}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.status}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.material}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.weightKg}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.recycler || "-"}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.processor || "-"}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {t.manufacturer || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ========== 區塊 3：Ledger 模擬結算 ========== */}
      <hr style={{ margin: "30px 0" }} />
      <h2>💰 Balances（模擬結算）</h2>
      {Object.keys(ledger).length === 0 ? (
        <p>尚無結算紀錄。</p>
      ) : (
        <pre
          style={{
            background: "#f6f8fa",
            padding: 12,
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {JSON.stringify(ledger, null, 2)}
        </pre>
      )}

      {/* ========== 區塊 4：自動一鍵執行 ========== */}
      <AutoDemoButton batchId={batchId} />
    </main>
  );
}