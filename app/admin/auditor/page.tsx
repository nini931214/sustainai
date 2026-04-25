// app/admin/auditor/page.tsx
'use client';

import { useEffect, useState } from 'react';
import BackToFlow from '@/app/components/BackToFlow';

type Batch = {
  id: string;
  material: string;
  kg: number;
  recycler?: { name?: string };
  processor?: { name?: string };
  manufacturer?: { name?: string };
  audit?: { status?: string; by?: string; ts?: number | string; note?: string };
};

export default function AuditorAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [auditorName, setAuditorName] = useState('ESG Auditor');
  const [note, setNote] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/recent?limit=50', { cache: 'no-store' });
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setBatches(items);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    setUpdatingId(id);
    setMessage(null);

    try {
      // ✅ 通過：走 /api/auditor/update（會寫 reports.json + batch_versions.json + 可自動上鏈）
      if (status === 'approved') {
        const res = await fetch('/api/auditor/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: id,
            status: 'approved', // ✅ 這行是關鍵，之前少了
            by: auditorName,
            note: note || '樣本資料：審計方已覆核此批次。',
          }),
        });

        const data = await res.json();

        if (!data.ok) {
          setMessage(`更新失敗：${data.error || 'unknown'}\n${data.message || ''}`);
        } else {
          setMessage(`批次 ${id} 審核狀態已更新為 approved（已生成可驗證資料）`);
          await load();
        }
        return;
      }

      // ✅ 退回 / 待審：走 /api/auditor/mark
      const res = await fetch('/api/auditor/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: id,
          status,
          by: auditorName,
          note,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(`更新失敗：${data.error || 'unknown'}\n${data.message || ''}`);
      } else {
        setMessage(`批次 ${id} 審核狀態已更新為 ${status}`);
        await load();
      }
    } catch (err) {
      console.error(err);
      setMessage('更新失敗：network');
    } finally {
      setUpdatingId(null);
    }
  }

  function renderStatus(b: Batch) {
    const s = b.audit?.status || 'pending';
    let color = '#6b7280';
    if (s === 'approved') color = '#16a34a';
    if (s === 'rejected') color = '#dc2626';

    return (
      <span style={{ fontSize: 12, color }}>
        {s === 'approved' && '通過'}
        {s === 'rejected' && '退回'}
        {s === 'pending' && '待審'}
      </span>
    );
  }

  function formatTs(ts?: number | string) {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
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
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
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
            稽核方入口（批次審核）
          </h1>
          <BackToFlow />
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          在這裡可以查看所有回收批次，並對其審核狀態做標記（通過 / 退回 / 待審）。
          審核結果會同步顯示在「批次履歷」與「批次清單」中。
        </p>

        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>稽核人名稱</label>
            <input
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
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
            <label style={{ fontSize: 13, fontWeight: 500 }}>備註（選填，會記錄在批次）</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：文件已齊全 / 缺少處理能耗證明 等"
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

        <div
          style={{
            borderRadius: 16,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>批次 ID</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>材料</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>重量(kg)</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>回收商</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>處理廠</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>製造商</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>審核狀態</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>稽核時間</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 10px' }}>{b.id}</td>
                  <td style={{ padding: '8px 10px' }}>{b.material}</td>
                  <td style={{ padding: '8px 10px' }}>{b.kg}</td>
                  <td style={{ padding: '8px 10px' }}>{b.recycler?.name || '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{b.processor?.name || '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{b.manufacturer?.name || '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{renderStatus(b)}</td>
                  <td style={{ padding: '8px 10px' }}>{formatTs(b.audit?.ts)}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={updatingId === b.id}
                        onClick={() => updateStatus(b.id, 'approved')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 12,
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        通過
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === b.id}
                        onClick={() => updateStatus(b.id, 'rejected')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 12,
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        退回
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === b.id}
                        onClick={() => updateStatus(b.id, 'pending')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 12,
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        待審
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: '10px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: 13,
                    }}
                  >
                    目前尚無任何批次資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {message && (
          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              color: message.startsWith('更新失敗') ? '#dc2626' : '#16a34a',
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