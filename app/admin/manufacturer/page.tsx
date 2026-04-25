// app/admin/manufacturer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import BackToFlow from '@/app/components/BackToFlow';

type Batch = {
  id: string;
  material: string;
  kg: number;
};

export default function ManufacturerAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [name, setName] = useState('Eco Device Co.');
  const [productName, setProductName] = useState('Recycled Shell Device');
  const [sku, setSku] = useState('EC-001');
  const [qty, setQty] = useState('100');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/recent?limit=50');
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        setBatches(items);
        if (items.length > 0) setBatchId(items[0].id);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/manufacturer/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: batchId,
          manufacturerName: name,
          product_name: productName,
          sku,
          qty: Number(qty || 0),
        }),
      });
      const data = await res.json();
      if (!data.ok) setStatus(`error:${data.error || 'unknown'}`);
      else setStatus('ok:updated');
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
        {/* ✅ Header */}
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
            <label style={{ fontSize: 13, fontWeight: 500 }}>選擇批次</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 13,
              }}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} — {b.material} ({b.kg}kg)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>製造商名稱</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>產品名稱</label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>SKU / Lot</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>出貨數量</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 16,
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: '#111827',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            更新產品資訊
          </button>

          {status && (
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