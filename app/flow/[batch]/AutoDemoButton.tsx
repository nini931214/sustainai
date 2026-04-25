"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type J = Record<string, any>;

export default function AutoDemoButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<J | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setLog(null);
    try {
      // 1) 取得該批次的 tokens
      const res1 = await fetch(
        `/api/token?batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store" }
      );
      const j1 = await res1.json();
      let items: any[] = j1.items || j1 || [];

      // 2) 若沒有 minted，就自動鑄造一顆
      let minted = items.find((t) => t.status === "minted");
      if (!minted) {
        const mintRes = await fetch("/api/trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            role: "recycler",
            actorName: "GreenCycle",
            data: { material: "PET", weightKg: 20 }
          })
        });
        const mintJson = await mintRes.json();

        const res2 = await fetch(
          `/api/token?batchId=${encodeURIComponent(batchId)}`,
          { cache: "no-store" }
        );
        const j2 = await res2.json();
        items = j2.items || j2 || [];
        minted = items.find((t: any) => t.status === "minted");
        if (!minted) throw new Error(mintJson?.error || "Mint token failed");
      }

      // 3) 直接 Process + Auto-Use
      const res3 = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process",
          tokenId: minted.tokenId,
          actorName: "EcoFactory",
          meta: { yieldRate: 0.9, energyKwh: 30 },
          autoUse: true,
          manufacturerName: "RenewTech",
          useMeta: { sku: "RB-DEMO", lot: "L202510" }
        })
      });
      const done = await res3.json();
      if (!res3.ok) throw new Error(done?.error || "Process/Use failed");

      setLog({ ok: true, batchId, minted: minted.tokenId, result: done });

      // 4) 讓頁面資料刷新（Tokens/Balance 立即更新）
      router.refresh();
    } catch (e: any) {
      setLog({ ok: false, error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ddd" }}>
      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          background: "#111827",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        {loading ? "執行中…" : "一鍵示範（Mint → Process → Use）"}
      </button>

      {log && (
        <pre
          style={{
            marginTop: 12,
            background: "#f6f8fa",
            padding: 12,
            borderRadius: 6,
            maxHeight: 320,
            overflow: "auto",
            fontSize: 12
          }}
        >
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </div>
  );
}