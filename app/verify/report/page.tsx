export default async function VerifyReportPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id || "RPT-001";
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/verify/report?id=${id}`, {
    cache: "no-store",
  });
  const v = await res.json();

  const ok = v?.reportPayloadHashMatch && v?.chain?.ok;

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Report Verify</h1>

      <div style={{ marginTop: 12, fontSize: 16 }}>
        狀態：{" "}
        <b style={{ color: ok ? "green" : "crimson" }}>
          {ok ? "✔ 已驗證（未偵測到串改）" : "✘ 驗證失敗（可能被修改或鏈不存在）"}
        </b>
      </div>

      <div style={{ marginTop: 16, lineHeight: 1.8 }}>
        <div>reportId：{v.reportId}</div>
        <div>batchVersionId：{v.batchVersionId}</div>
        <div>reportPayloadHash：{v.reportPayloadHash}</div>
        <div>reportPayloadHashMatch：{String(v.reportPayloadHashMatch)}</div>
        <div>chain.ok：{String(v.chain?.ok)}</div>
        <div>chain.checked：{String(v.chain?.checked)}</div>
        {v.chain?.reason ? <div>chain.reason：{String(v.chain.reason)}</div> : null}
      </div>

      <pre style={{ marginTop: 16, background: "#111", color: "#eee", padding: 12, overflow: "auto" }}>
{JSON.stringify(v, null, 2)}
      </pre>
    </main>
  );
}