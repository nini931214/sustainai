'use client';

import BackToFlow from '@/app/components/BackToFlow';
import { useEffect, useState } from 'react';

type Batch = {
  id: string;
  material?: string;
  kg?: number;
  weight?: number;
  quantity?: number;
};

export default function ProcessorAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [name, setName] = useState('Processor Plant A');
  const [inputKg, setInputKg] = useState('');
  const [outputKg, setOutputKg] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [energy, setEnergy] = useState('');
  const [water, setWater] = useState('');
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
      const res = await fetch('/api/processor/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          batchId,
          processor: {
            name,
            input_kg: Number(inputKg || 0),
            output_kg: Number(outputKg || 0),
            waste_kg: Number(wasteKg || 0),
            energy_kwh: Number(energy || 0),
            water_l: Number(water || 0),
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
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            處理廠入口（再生加工紀錄）
          </h1>
          <BackToFlow />
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          選擇一個已建立的回收批次，填寫再生加工資訊（輸入重量、輸出重量、耗能等）。
        </p>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 18,
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 22px rgba(15, 23, 42, 0.06)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>選擇批次</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                style={inputStyle}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} — {b.material || '—'} ({b.kg ?? b.weight ?? b.quantity ?? '—'}kg)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>處理廠名稱</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumberInput label="輸入重量 (kg)" value={inputKg} onChange={setInputKg} />
              <NumberInput label="輸出重量 (kg)" value={outputKg} onChange={setOutputKg} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <NumberInput label="報廢重量 (kg)" value={wasteKg} onChange={setWasteKg} />
              <NumberInput label="耗電量 (kWh)" value={energy} onChange={setEnergy} />
            </div>

            <div style={{ marginTop: 12 }}>
              <NumberInput label="用水量 (L)" value={water} onChange={setWater} />
            </div>

            <button
              type="submit"
              disabled={!batchId || status === 'loading'}
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 999,
                border: 'none',
                backgroundColor: '#111827',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                opacity: !batchId || status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? '更新中…' : '更新批次加工資訊'}
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
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  display: 'block',
  color: '#111827',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

function NumberInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  const { label, value, onChange } = props;
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}