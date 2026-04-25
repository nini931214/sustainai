'use client';

import React, { useEffect, useRef, useState } from 'react';
import BackToFlow from '@/app/components/BackToFlow';

type SubmitResp = { ok: boolean; error?: string };

export default function AdminScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [decoded, setDecoded] = useState<string>('');
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<SubmitResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 啟動相機 + 連續掃描（支援 BarcodeDetector）
  const startScan = async () => {
    setError(null);
    setResult(null);
    setDecoded('');
    setPosting(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // 若瀏覽器有 BarcodeDetector（Chrome/Edge/Safari 現代版）
      // 以固定頻率偵測
      const hasBD = 'BarcodeDetector' in window;
      if (hasBD) {
        // @ts-expect-error: BarcodeDetector 不是 TS 內建型別
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (!videoRef.current) return;
          try {
            const detections = await detector.detect(videoRef.current);
            const text = detections?.[0]?.rawValue;
            if (text && !posting) {
              stopScan();
              onDecoded(text);
            }
          } catch {
            // 忽略單次失敗
          }
        };
        intervalRef.current = window.setInterval(tick, 300) as unknown as number;
      } else {
        setError('此瀏覽器不支援即時掃描，請改用「從圖片上傳」或「貼上文字」。');
      }
    } catch (e: any) {
      setError('無法啟動相機：' + String(e?.message ?? e));
    }
  };

  const stopScan = () => {
    setScanning(false);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  };

  // 上傳圖片（若瀏覽器支援 BarcodeDetector，可對圖片偵測）
  const onPickImage = async (file: File) => {
    setError(null);
    setResult(null);
    setDecoded('');
    setPosting(false);

    const hasBD = 'BarcodeDetector' in window;
    if (!hasBD) {
      setError('此瀏覽器不支援圖片解碼，請改用「即時掃描」或「直接貼上文字」。');
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => (img.onload = () => r(null)));

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // @ts-expect-error: BarcodeDetector 非 TS 內建
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    try {
      const detections = await detector.detect(canvas);
      const text = detections?.[0]?.rawValue;
      if (text) onDecoded(text);
      else setError('未從圖片辨識到 QR 內容。');
    } catch (e: any) {
      setError('圖片解碼失敗：' + String(e?.message ?? e));
    }
  };

  const onDecoded = async (text: string) => {
    setDecoded(text);
    setPosting(true);
    setResult(null);
    setError(null);
    try {
      const resp = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: text, source: 'scan' }),
      });
      const json: SubmitResp = await resp.json();
      setResult(json);
    } catch (e: any) {
      setResult({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* ✅ Header：放在 return 裡最上面 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          掃描入口（QR 綁定）
        </h1>
        <BackToFlow />
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📡 驗章掃描</h1>
      <p style={{ color: '#555', marginBottom: 16 }}>
        方式一：即時相機掃描（支援 BarcodeDetector 的瀏覽器）；
        方式二：從圖片上傳；方式三：直接貼上 QR 內容。
      </p>

      {/* 相機 */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          {!scanning ? (
            <button onClick={startScan} style={btn}>
              開始即時掃描
            </button>
          ) : (
            <button onClick={stopScan} style={btnSecondary}>
              停止掃描
            </button>
          )}

          <label style={btn}>
            從圖片上傳
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
            />
          </label>
        </div>

        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 12,
            border: '1px solid #eee',
            display: scanning ? 'block' : 'none',
          }}
        />
      </section>

      {/* 文字貼上 */}
      <section style={{ marginBottom: 20 }}>
        <textarea
          placeholder="或直接貼上 QR 解析後的文字內容（JSON / 文字）"
          value={decoded}
          onChange={(e) => setDecoded(e.target.value)}
          rows={5}
          style={ta}
        />
        <div>
          <button onClick={() => onDecoded(decoded)} style={btn} disabled={!decoded || posting}>
            送出 /api/submit
          </button>
        </div>
      </section>

      {/* 結果顯示 */}
      {posting && <p>⏳ 傳送中…</p>}
      {!!error && <p style={{ color: '#c00' }}>❌ {error}</p>}
      {!!result && <pre style={pre}>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #ddd',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  ...btn,
  background: '#fff',
  color: '#111',
};

const ta: React.CSSProperties = {
  width: '100%',
  maxWidth: 620,
  borderRadius: 12,
  border: '1px solid #eee',
  padding: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  marginBottom: 8,
};

const pre: React.CSSProperties = {
  background: '#f7f7f7',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 12,
  fontSize: 13,
  maxWidth: 620,
  overflowX: 'auto',
};