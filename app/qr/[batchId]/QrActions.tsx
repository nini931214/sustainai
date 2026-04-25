"use client";

type Props = {
  batchId: string;
};

export default function QrActions({ batchId }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* 只保留下載 QR PNG */}
      <a
        href={`/qr/${encodeURIComponent(batchId)}/image`}
        download={`QR-${batchId}.png`}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        ⬇️ 下載 QR PNG
      </a>
    </div>
  );
}