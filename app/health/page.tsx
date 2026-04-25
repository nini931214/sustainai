'use client';

import { useEffect, useState } from 'react';
import BackToFlow from '@/app/components/BackToFlow';

type HealthData = {
  ok: boolean;
  results?: {
    versionsExist?: boolean;
    appendOnly?: boolean | string;
    verifyApi?: boolean;
    signatureCount?: number;
    hasAuditor?: boolean;
    otsStatus?: string;
    onchain?: string;
    hasEvents?: boolean;
  };
  summary?: {
    versions?: string;
    appendOnly?: boolean | string;
    verify?: string;
    signatures?: number;
    ots?: string;
    onchain?: string;
  };
  error?: string;
  message?: string;
};

function Pill({
  ok,
  label,
}: {
  ok: boolean | 'warn';
  label: string;
}) {
  const tone =
    ok === true
      ? { bg: 'rgba(16,185,129,0.12)', bd: '#bbf7d0', fg: '#065f46' }
      : ok === 'warn'
      ? { bg: 'rgba(234,179,8,0.14)', bd: '#fde68a', fg: '#854d0e' }
      : { bg: 'rgba(239,68,68,0.12)', bd: '#fecaca', fg: '#7f1d1d' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 900,
        border: `1px solid ${tone.bd}`,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: ok === true ? '#10b981' : ok === 'warn' ? '#eab308' : '#ef4444',
        }}
      />
      {label}
    </span>
  );
}

function Card({
  title,
  value,
  state,
}: {
  title: string;
  value: string;
  state: boolean | 'warn';
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        background: '#fff',
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b' }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
        {value}
      </div>
      <div style={{ marginTop: 10 }}>
        <Pill
          ok={state}
          label={state === true ? 'OK' : state === 'warn' ? 'WARN' : 'FAIL'}
        />
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/health/checklist', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setData({
        ok: false,
        error: 'HEALTH_FETCH_FAILED',
        message: String(err?.message || err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function repair() {
    try {
      setRepairing(true);
      setMessage(null);

      const res = await fetch('/api/health/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setMessage(`修復失敗：${json?.error || 'unknown'}`);
      } else {
        setMessage('自動修復完成');
      }

      await load();
    } catch (err: any) {
      setMessage(`修復失敗：${String(err?.message || err)}`);
    } finally {
      setRepairing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const r = data?.results || {};

  const appendState =
    r.appendOnly === true ? true : r.appendOnly === 'unknown' ? 'warn' : false;

  const otsState =
    r.otsStatus === 'complete'
      ? true
      : r.otsStatus === 'pending'
      ? 'warn'
      : false;

  const chainState =
    r.onchain === 'anchored' ? true : r.onchain === 'notAnchored' ? false : 'warn';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(#f8fafc, #ffffff)',
        padding: '32px 16px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
              System Health Dashboard
            </h1>
            <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
              自動檢查版本鏈、簽章、OTS、上鏈狀態，並可一鍵修復缺失項目。
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {loading ? '檢查中...' : '重新檢查'}
            </button>

            <button
              type="button"
              onClick={repair}
              disabled={repairing}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #111827',
                background: '#111827',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {repairing ? '修復中...' : '一鍵自動修復'}
            </button>

            <BackToFlow />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <Card title="Versions" value={String(r.versionsExist ? 'Exists' : 'Missing')} state={!!r.versionsExist} />
          <Card title="Append-only" value={String(r.appendOnly ?? 'unknown')} state={appendState} />
          <Card title="Verify API" value={String(r.verifyApi ? 'OK' : 'FAIL')} state={!!r.verifyApi} />
          <Card title="Signatures" value={String(r.signatureCount ?? 0)} state={(r.signatureCount || 0) > 0} />
          <Card title="OTS" value={String(r.otsStatus || 'missing')} state={otsState} />
          <Card title="On-chain" value={String(r.onchain || 'unknown')} state={chainState} />
          <Card title="Events" value={String(r.hasEvents ? 'Present' : 'Missing')} state={!!r.hasEvents} />
          <Card title="Auditor Sig" value={String(r.hasAuditor ? 'Present' : 'Missing')} state={!!r.hasAuditor} />
        </div>

        <div
          style={{
            marginTop: 18,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            background: '#fff',
            padding: 18,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Summary</div>
          <pre
            style={{
              marginTop: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#0f172a',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        {message && (
          <p
            style={{
              marginTop: 12,
              fontSize: 13,
              color: message.includes('失敗') ? '#dc2626' : '#16a34a',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}