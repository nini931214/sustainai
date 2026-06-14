// app/trace/[batchId]/page.tsx
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import type { CSSProperties } from "react";
import BackToFlow from "../../components/BackToFlow";
import ApproveButton from "./ApproveButton";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function calcFootprint(batch: any) {
  const kg = Number(batch?.kg ?? batch?.weight ?? 0);
  const distance = Number(batch?.transport?.distance_km ?? 0);
  const energy = Number(batch?.processor?.energy_kwh ?? 0);

  const transport_co2e = distance * 0.02;
  const process_co2e = energy * 0.5;
  const total_co2e = transport_co2e + process_co2e + kg * 0.1;

  return { total_co2e, transport_co2e, process_co2e };
}

async function getBatch(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export default async function TracePublicPage({
  params,
}: {
  params: { batchId: string };
}) {
  noStore();

  const id = decodeURIComponent(params.batchId);
  const batch = await getBatch(id);
  const footprint = batch ? calcFootprint(batch) : null;

  const material = batch?.material ?? "—";
  const kg = batch?.kg ?? batch?.weight ?? "—";

  const recyclerName =
    batch?.recycler?.name ??
    (typeof batch?.recycler === "string" ? batch?.recycler : "—");

  const processorName =
    batch?.processor?.name ??
    (typeof batch?.processor === "string" ? batch?.processor : "—");

  const manufacturerName =
    batch?.manufacturer?.name ??
    (typeof batch?.manufacturer === "string" ? batch?.manufacturer : "—");

  const auditStatus = batch?.audit?.status ?? batch?.status ?? "pending";
  const auditNote = batch?.audit?.note ?? "";
  const auditBy = batch?.audit?.by ?? "—";

  const total =
    typeof footprint?.total_co2e === "number" ? footprint.total_co2e : null;
  const transport =
    typeof footprint?.transport_co2e === "number" ? footprint.transport_co2e : null;
  const process =
    typeof footprint?.process_co2e === "number" ? footprint.process_co2e : null;

  const items = [
    {
      title: "回收（Recycler）",
      ok: recyclerName !== "—",
      desc: recyclerName !== "—" ? `回收商：${recyclerName}` : "尚無回收節點資料",
    },
    {
      title: "處理（Process）",
      ok: processorName !== "—",
      desc: processorName !== "—" ? `處理商：${processorName}` : "尚無處理節點資料",
    },
    {
      title: "製造（Manufacture）",
      ok: manufacturerName !== "—",
      desc:
        manufacturerName !== "—" ? `製造商：${manufacturerName}` : "尚無製造節點資料",
    },
    {
      title: "稽核（Audit）",
      ok: Boolean(batch?.audit),
      desc: batch?.audit
        ? `狀態：${auditStatus}｜核准者：${auditBy}${
            auditNote ? `｜備註：${auditNote}` : ""
          }`
        : "尚無稽核節點資料",
    },
  ];

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
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
              批次追溯履歷（公開頁）
            </h1>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              掃描 QR 後顯示回收 → 處理 → 製造 → 稽核之履歷摘要（Demo）。
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <BackToFlow />
            <Link href={`/qr/${encodeURIComponent(id)}`}>
              <span style={btnStyle}>返回 QR 標籤</span>
            </Link>
            <Link href="/recent">
              <span style={btnStyle}>回批次清單</span>
            </Link>
          </div>
        </div>

        {!batch ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              padding: 16,
              color: "#9f1239",
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>找不到批次資料</div>
            <div style={{ fontSize: 13 }}>
              目前 trace 頁讀取：<code>supabase:batches</code>
              <br />
              請到 <code>/recent</code> 確認批次 ID。
            </div>
          </div>
        ) : null}

        {batch ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              background: "#fff",
              border: "1px solid #e5e7eb",
              boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
                  手動核准（產生可驗證資料）
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>
                  點「核准」會呼叫 <code>/api/auditor/update</code>，寫入{" "}
                  <code>Supabase batches</code> 與 <code>batch_versions</code>，讓此批次可進入 Verify。
                </div>
              </div>

              <ApproveButton batchId={id} />
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>批次基本資訊</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <KV k="Batch ID" v={id} />
              <KV k="材料" v={String(material)} />
              <KV k="重量 (kg)" v={String(kg)} />
              <KV k="回收商" v={String(recyclerName)} />
              <KV k="處理商" v={String(processorName)} />
              <KV k="製造商" v={String(manufacturerName)} />
              <KV k="稽核狀態" v={String(auditStatus)} />
              <KV k="核准者" v={String(auditBy)} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1.2fr 0.8fr",
              alignItems: "start",
            }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
                流程履歷（Timeline）
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 14,
                      border: it.ok ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                      background: it.ok ? "rgba(16,185,129,0.08)" : "#f8fafc",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{it.title}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                      {it.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
                碳排摘要（Demo）
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                此為示範估算欄位（正式版可替換成更細緻的計算模型或第三方盤查結果）。
              </div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b" }}>總碳足跡</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                  {typeof total === "number" ? `${total.toFixed(2)} kg CO2e` : "—"}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                  <div>運輸：{typeof transport === "number" ? transport.toFixed(2) : "—"} kg CO2e</div>
                  <div>處理：{typeof process === "number" ? process.toFixed(2) : "—"} kg CO2e</div>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                ※ 可用於永續報告與 ESG Dashboard 的「循環績效」章節。
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const btnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
};

const cardStyle: CSSProperties = {
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  padding: 22,
};

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", padding: "10px 12px" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{k}</div>
      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{v}</div>
    </div>
  );
}