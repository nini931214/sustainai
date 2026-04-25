// app/admin/signatures/page.tsx
"use client";

import { useEffect, useState } from "react";
import BackToFlow from "@/app/components/BackToFlow";

type Batch = {
  id: string;
  material?: string;
  kg?: number;
  recycler?: { name?: string };
  processor?: { name?: string };
  manufacturer?: { name?: string };
  audit?: { status?: string; by?: string };
};

type Role = "recycler" | "processor" | "manufacturer" | "auditor";

export default function SignaturesAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [msg, setMsg] = useState<string>("");

  async function load() {
    const res = await fetch("/api/recent?limit=50");
    const data = await res.json();
    setBatches(Array.isArray(data?.items) ? data.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function sign(batchId: string, role: Role) {
    setMsg("");
    try {
      const signerName =
        role === "recycler"
          ? "Recycler Signer"
          : role === "processor"
          ? "Processor Signer"
          : role === "manufacturer"
          ? "Manufacturer Signer"
          : "ESG Auditor";

      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, role, signerName }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(`❌ 簽章失敗：${data.error || "unknown"} ${data.message ? `(${data.message})` : ""}`);
      } else {
        setMsg(`✅ ${batchId} 已由 ${role} 加簽（hash=${String(data.batchVersionHash).slice(0, 10)}...）`);
      }
    } catch (e) {
      setMsg("❌ 簽章失敗：network");
    }
  }

  const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontSize: 13, color: "#334155" };
  const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderTop: "1px solid #e5e7eb" };

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 16px", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>多角色簽章（Demo Console）</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              對同一筆 batchVersionHash 追加 recycler / processor / manufacturer / auditor 的簽章。
            </div>
          </div>
          <BackToFlow />
        </div>

        <div style={{ marginTop: 16, borderRadius: 16, background: "#fff", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th style={th}>批次</th>
                <th style={th}>材料 / 重量</th>
                <th style={th}>狀態</th>
                <th style={th}>加簽操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td style={td}><b>{b.id}</b></td>
                  <td style={td}>{b.material || "—"} / {typeof b.kg === "number" ? `${b.kg} kg` : "—"}</td>
                  <td style={td}>{b.audit?.status || "pending"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn label="Recycler 簽" onClick={() => sign(b.id, "recycler")} />
                      <Btn label="Processor 簽" onClick={() => sign(b.id, "processor")} />
                      <Btn label="Manufacturer 簽" onClick={() => sign(b.id, "manufacturer")} />
                      <Btn label="Auditor 簽" onClick={() => sign(b.id, "auditor")} />
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={4}>
                    沒有批次。請先建立 batch（chain.json）。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {msg ? (
          <div style={{ marginTop: 12, fontSize: 13, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
            {msg}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Btn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
        color: "#0f172a",
      }}
    >
      {label}
    </button>
  );
}