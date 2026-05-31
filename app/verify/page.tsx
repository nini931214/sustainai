"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BackToFlow from "../components/BackToFlow";

/* =======================
 * Types
 * ======================= */

type VerifyApiResponse = {
  ok: boolean;
  error?: string;
  message?: string;

  reportId?: string;
  batchId?: string;

  received?: {
    reportId?: string;
    batchId?: string;
    batchVersionHash?: string;
    reportPayloadHash?: string | null;
    batchVersionId?: string | null;
  };

  resolved?: {
    batchVersionId?: string;
    batchVersionHash?: string;
  };

  report?: {
    stored_report_payload_hash?: string | null;
    recomputed_report_payload_hash?: string;
    audit_time_iso?: string | null;
    time_source?: string | null;
  };

  batchVersion?: {
    events?: any[];
    signatureResults?: any[];
  };

  ots?: {
    status?: string;
    verifyError?: string;
    files?: {
      hashFile?: string | null;
      otsFile?: string | null;
    };
    receiptUrl?: string | null;
    downloadUrl?: string | null;
  };

  checks?: {
    signatureOk?: boolean;
    signatureResults?: any[];
    reportPayloadHashMatches?: boolean;
    batchVersionHashMatches?: boolean;
    otsStatus?: string;
    otsReceiptUrl?: string | null;
  };
};

/* =======================
 * UI helpers
 * ======================= */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#f8fafc, #ffffff)",
  padding: "32px 16px",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  padding: 20,
};

function Pill({
  tone,
  text,
}: {
  tone: "green" | "yellow" | "red" | "gray";
  text: string;
}) {
  const map: Record<typeof tone, React.CSSProperties> = {
    green: { background: "rgba(16,185,129,.12)", color: "#065f46" },
    yellow: { background: "rgba(234,179,8,.14)", color: "#854d0e" },
    red: { background: "rgba(239,68,68,.12)", color: "#7f1d1d" },
    gray: { background: "#f8fafc", color: "#334155" },
  };
  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        border: "1px solid #e5e7eb",
        ...map[tone],
      }}
    >
      {text}
    </span>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "8px 10px",
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b" }}>{k}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          wordBreak: "break-all",
          whiteSpace: "pre-wrap",
        }}
      >
        {v || "—"}
      </div>
    </div>
  );
}

function fmtTs(ts: any) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(+d) ? String(ts) : d.toLocaleString();
}

function roleLabel(r?: string) {
  if (!r) return "Unknown";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/* =======================
 * Page
 * ======================= */

function VerifyPageInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const reportId = sp.get("reportId") || "";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VerifyApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const apiUrl = `/api/verify?reportId=${encodeURIComponent(reportId)}`;

  useEffect(() => {
    if (!reportId) {
      setErr("缺少 reportId");
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl, { cache: "no-store" });
        const json = (await res.json()) as VerifyApiResponse;
        if (!alive) return;
        if (!res.ok || json.ok === false) {
          setErr(json.error || "VERIFY_FAILED");
          setData(json);
        } else {
          setData(json);
          setErr(null);
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiUrl, reportId]);

  const checks = data?.checks;
  const status = useMemo(() => {
    if (!checks) return { tone: "gray" as const, label: "UNKNOWN" };
    if (checks.signatureOk === false || checks.reportPayloadHashMatches === false)
      return { tone: "red" as const, label: "FAILED" };
    if (checks.otsStatus === "pending")
      return { tone: "yellow" as const, label: "WARN" };
    return { tone: "green" as const, label: "PASS" };
  }, [checks]);

  const signatureResults =
    checks?.signatureResults || data?.batchVersion?.signatureResults || [];

  const events = data?.batchVersion?.events || [];

  const otsDownload =
    data?.ots?.receiptUrl ||
    data?.ots?.downloadUrl ||
    checks?.otsReceiptUrl ||
    null;

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>驗證結果</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill tone={status.tone} text={status.label} />
            <BackToFlow />
          </div>
        </div>

        {/* Summary */}
        <section style={cardStyle}>
          <div style={{ fontWeight: 900 }}>
            {loading ? "驗證中…" : err ? `失敗：${err}` : "驗證完成"}
          </div>
        </section>

        {/* OTS */}
        <section style={cardStyle}>
          <h3>OTS Receipt</h3>
          <Pill
            tone={
              data?.ots?.status === "complete"
                ? "green"
                : data?.ots?.status === "pending"
                ? "yellow"
                : "gray"
            }
            text={`狀態：${data?.ots?.status || "unknown"}`}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <KV k="hashFile" v={String(data?.ots?.files?.hashFile || "")} />
            <KV k="otsFile" v={String(data?.ots?.files?.otsFile || "")} />
          </div>
          <div style={{ marginTop: 10 }}>
            <a
              href={otsDownload || "#"}
              style={{ pointerEvents: otsDownload ? "auto" : "none" }}
            >
              下載 OTS receipt
            </a>
          </div>
        </section>

        {/* Signatures */}
        <section style={cardStyle}>
          <h3>多角色簽章</h3>
          {signatureResults.length === 0 ? (
            <div>尚無簽章</div>
          ) : (
            signatureResults.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong>{roleLabel(s.role)}</strong> —{" "}
                <Pill tone={s.ok ? "green" : "red"} text={s.ok ? "OK" : "FAIL"} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <KV k="signer" v={String(s.signer || "")} />
                  <KV k="signerName" v={String(s.signerName || "")} />
                  <KV k="alg" v={String(s.alg || "")} />
                  <KV k="ts" v={fmtTs(s.ts)} />
                </div>
              </div>
            ))
          )}
        </section>

        {/* Events */}
        <section style={cardStyle}>
          <h3>Version Events</h3>
          {events.length === 0 ? (
            <div>尚無事件</div>
          ) : (
            events.map((ev: any, i: number) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong>{ev.type || "event"}</strong> — {fmtTs(ev.ts)}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <KV k="by" v={String(ev.by || "")} />
                  <KV k="role" v={String(ev.role || "")} />
                  <KV k="note" v={String(ev.note || "")} />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading...</main>}>
      <VerifyPageInner />
    </Suspense>
  );
}