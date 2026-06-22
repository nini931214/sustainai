'use client';

import { useEffect, useState } from 'react';
import BackToFlow from '@/app/components/BackToFlow';

type Batch = {
  id: string;
  material?: string;
  kg?: number;
  weight?: number;
  quantity?: number;
};

export default function ManufacturerAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [name, setName] = useState('Eco Device Co.');
  const [productName, setProductName] = useState('Recycled Shell Device');
  const [sku, setSku] = useState('EC-001');
  const [qty, setQty] = useState('100');
  const [status, setStatus] = useState<string | null>(null);

  async function loadBatches() {
    try {
      const res = await fetch(`/api/recent?limit=50&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      const items = Array.isArray(data.items) ? (data.items as Batch[]) : [];
      setBatches(items);
      if (items.length > 0 && !batchId) setBatchId(items[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/manufacturer/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          batchId,
          manufacturer: {
            name,
            product_name: productName,
            sku,
            qty: Number(qty || 0),
          },
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setStatus(`error:${data.error || data.message || 'unknown'}`);
      } else {
        setStatus('ok:updated');
        await loadBatches();
      }
    } catch (err) {
      console.error(err);
      setStatus('error:network');
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fb',
        padding: '32px 16px',
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            製造商入口（綁定產品批次）
          </h1>
          <BackToFlow />
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          選擇一個已經完成回收與處理的批次，綁定為具體產品，並填寫出貨數量與 SKU。
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>選擇批次</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} style={inputStyle}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} — {b.material || '—'} ({b.kg ?? b.weight ?? b.quantity ?? '—'}kg)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>製造商名稱</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>產品名稱</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>SKU / Lot</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>出貨數量</label>
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button
            type="submit"
            disabled={!batchId || status === 'loading'}
            style={{
              marginTop: 16,
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: '#111827',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              opacity: !batchId || status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? '更新中…' : '更新產品資訊'}
          </button>

          {status && status !== 'loading' && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                color: status.startsWith('ok') ? '#16a34a' : '#dc2626',
              }}
            >
              {status.startsWith('ok')
                ? '更新成功！'
                : `更新失敗：${status.split(':')[1] || '請稍後再試'}`}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 13,
  boxSizing: 'border-box',
};