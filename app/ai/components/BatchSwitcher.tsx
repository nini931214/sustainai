"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

type BatchOption = {
  id: string;
  material?: string;
  kg?: number | string;
};

export default function BatchSwitcher(props: {
  batches: BatchOption[];
  currentId: string;
}) {
  const { batches, currentId } = props;
  const router = useRouter();

  return (
    <select
      value={currentId}
      onChange={(e) => {
        const id = e.target.value;
        router.push(`/ai?batch=${encodeURIComponent(id)}`);
        router.refresh(); // ✅ 確保 server component 重新抓資料
      }}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 13,
        minWidth: 260,
      }}
    >
      {batches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.id}
          {b.material ? ` · ${b.material}` : ""}
          {b.kg != null ? ` · ${Number(b.kg || 0).toFixed(1)} kg` : ""}
        </option>
      ))}
    </select>
  );
}