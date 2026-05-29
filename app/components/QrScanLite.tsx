'use client';
import React from 'react';
import  BarcodeScannerComponent  from 'react-qr-barcode-scanner';

export default function QrScanLite({
  onScan,
  height = 300,
}: {
  onScan: (value: string) => void;
  height?: number;
}) {
  return (
    <BarcodeScannerComponent
      width={'100%'}
      height={height}
      onUpdate={(_, result) => {
        const val = result?.getText?.();
        if (val) onScan(val);
      }}
    />
  );
}