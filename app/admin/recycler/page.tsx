// app/admin/recycler/page.tsx
'use client';

import { useState } from 'react';
import BackToFlow from '@/app/components/BackToFlow';

export default function RecyclerAdminPage() {
  const [material, setMaterial] = useState('PET');
  const [kg, setKg] = useState('20');
  const [name, setName] = useState('GreenCycle Station');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/recycler/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material,
          kg: Number(kg),
          recyclerName: name,
        }),
      });

      const data = await res.json();
      if (!data.ok) setStatus(`error:${data.error || 'unknown'}`);
      else setStatus(`ok:${data.batch.id}`);
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
            回收商入口（建立回收批次）
          </h1>
          <BackToFlow />
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          在這裡新增一個回收材料批次，之後可由處理廠與製造商接續填寫。
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
            <label style={{ fontSize: 13, fontWeight: 500 }}>回收站名稱</label>
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
            <label style={{ fontSize: 13, fontWeight: 500 }}>材料類型</label>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
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
            <label style={{ fontSize: 13, fontWeight: 500 }}>重量 (kg)</label>
            <input
              type="number"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
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

          <button
            type="submit"
            style={{
              marginTop: 4,
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: '#111827',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            建立批次
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
                ? `建立成功，批次 ID：${status.split(':')[1]}`
                : `建立失敗：${status.split(':')[1] || '請稍後再試'}`}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}