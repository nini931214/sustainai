'use client';
import { QRCodeCanvas } from 'qrcode.react';

export default function QrBox({
  value, size = 200, label
}: { value: string; size?: number; label?: string }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 8,
      padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff'
    }}>
      <QRCodeCanvas value={value} size={size} />
      {label && <div style={{ fontSize: 13, color: '#555', textAlign: 'center', maxWidth: size }}>{label}</div>}
    </div>
  );
}