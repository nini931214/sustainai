"use client";

import { useEffect, useState } from "react";

export default function VerifyClient({
  hasRequired,
  params,
}: {
  hasRequired: boolean;
  params: {
    reportId: string;
    batchId: string;
    batchVersionId: string;
    reportPayloadHash?: string;
    batchVersionHash?: string;
  };
}) {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (!hasRequired) return; // ✅ 沒帶齊就不打 API

    const qs = new URLSearchParams();
    qs.set("reportId", params.reportId);
    qs.set("batchId", params.batchId);
    qs.set("batchVersionId", params.batchVersionId);
    if (params.reportPayloadHash) qs.set("reportPayloadHash", params.reportPayloadHash);
    if (params.batchVersionHash) qs.set("batchVersionHash", params.batchVersionHash);

    fetch(`/api/verify?${qs.toString()}`)
      .then((r) => r.json())
      .then(setState)
      .catch((e) => setState({ ok: false, error: "FETCH_FAILED", message: String(e) }));
  }, [hasRequired, params]);

  if (!hasRequired) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #f5c2c7",
            background: "#fff5f5",
            color: "#b42318",
            fontWeight: 600,
          }}
        >
          ⚠️ 驗證失敗：MISSING_PARAMS（請用 QR 連結進入）
        </div>
      </div>
    );
  }

  if (!state) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!state.ok) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #f5c2c7",
            background: "#fff5f5",
            color: "#b42318",
            fontWeight: 600,
          }}
        >
          ⚠️ 驗證失敗：{state.error}
        </div>
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}