// app/components/ReportWatermarkedShell.tsx
import React from 'react';

type Props = {
  children: React.ReactNode;

  /** 是否顯示浮水印（Demo / 非官方） */
  demo?: boolean;

  /** public 底下的圖片路徑 */
  logoSrc?: string;

  /** 透明度 (0~1) */
  opacity?: number;

  /** 旋轉角度 */
  rotateDeg?: number;

  /** 圖片最大寬度（避免太大） */
  maxWidthPercent?: number;
};

export default function ReportWatermarkedShell({
  children,
  demo = true,
  logoSrc = '/brand/logo.png',
  opacity = 0.07,
  rotateDeg = -18,
  maxWidthPercent = 65,
}: Props) {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        // 這個殼本身不強制白底，讓你的 section 原本白底樣式保持一致
      }}
    >
      {demo && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          <img
            src={logoSrc}
            alt=""
            style={{
              width: `${maxWidthPercent}%`,
              opacity,
              transform: `rotate(${rotateDeg}deg)`,
              filter: 'grayscale(100%)',
            }}
          />
        </div>
      )}

      {/* 內容層 */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </section>
  );
}