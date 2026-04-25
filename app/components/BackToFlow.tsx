'use client';

import Link from "next/link";

export default function BackToFlow() {
  return (
    <Link href="/flow">
      <span
        style={{
          fontSize: 13,
          color: "#2563eb",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ← 回流程總覽
      </span>
    </Link>
  );
}