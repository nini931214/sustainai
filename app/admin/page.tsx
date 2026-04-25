"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import BackToFlow from "@/app/components/BackToFlow";

type TokenRow = {
  tokenId: string;
  status: "minted" | "processed" | "used";
  material: string;
  kg: number;
  recycler: string;
  processor?: string;
  manufacturer?: string;
};

const demoBatchId = "BATCH-2025-001";

function nowId() {
  return `T-${Date.now()}`;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function Divider() {
  return <div className="my-6 h-px w-full bg-slate-200/80" />;
}

export default function AdminConsolePage() {
  // ---- Demo Data (你可以之後改成接後端/合約) ----
  const [tokens, setTokens] = useState<TokenRow[]>([
    {
      tokenId: "T-1761718898588",
      status: "used",
      material: "PET",
      kg: 20,
      recycler: "GreenCycle",
      processor: "EcoFactory",
      manufacturer: "RenewTech",
    },
    {
      tokenId: "T-1761718281686",
      status: "used",
      material: "PET",
      kg: 20,
      recycler: "GreenCycle",
      processor: "EcoFactory",
      manufacturer: "RenewTech",
    },
  ]);

  // ---- Process 區塊 state ----
  const [tokenId, setTokenId] = useState(tokens[0]?.tokenId ?? "");
  const [processorName, setProcessorName] = useState("EcoFactory");
  const [yieldRate, setYieldRate] = useState("0.9");
  const [energyKwh, setEnergyKwh] = useState("30");
  const [autoUse, setAutoUse] = useState(true);

  // ---- Use 區塊 state ----
  const [useTokenId, setUseTokenId] = useState(tokens[0]?.tokenId ?? "");
  const [manufacturerName, setManufacturerName] = useState("RenewTech");
  const [sku, setSku] = useState("RB-200");
  const [lot, setLot] = useState("L20251028");

  // ---- 方便顯示狀態 ----
  const statusLabel = (s: TokenRow["status"]) => {
    if (s === "minted") return "minted";
    if (s === "processed") return "processed";
    return "used";
  };
  const statusTone = (s: TokenRow["status"]) => {
    if (s === "minted") return "bg-slate-100 text-slate-700";
    if (s === "processed") return "bg-amber-100 text-amber-800";
    return "bg-emerald-100 text-emerald-800";
  };

  // ---- Balances (demo) ----
  const balances = useMemo(() => {
    const byMaterial: Record<string, number> = {};
    tokens.forEach((t) => {
      byMaterial[t.material] = (byMaterial[t.material] ?? 0) + t.kg;
    });
    return byMaterial;
  }, [tokens]);

  // ---- Actions ----
  const ensureTokenExists = (id: string) => {
    const found = tokens.find((t) => t.tokenId === id);
    if (!found) {
      // 如果你貼進來的是不存在 token，就先自動補一筆 minted（demo 方便）
      setTokens((prev) => [
        {
          tokenId: id || nowId(),
          status: "minted",
          material: "PET",
          kg: 20,
          recycler: "GreenCycle",
        },
        ...prev,
      ]);
    }
  };

  const runProcess = () => {
    if (!tokenId.trim()) return;
    ensureTokenExists(tokenId.trim());

    setTokens((prev) =>
      prev.map((t) => {
        if (t.tokenId !== tokenId.trim()) return t;
        return {
          ...t,
          status: "processed",
          processor: processorName || "EcoFactory",
        };
      })
    );

    if (autoUse) {
      setUseTokenId(tokenId.trim());
      runUse(tokenId.trim());
    }
  };

  const runUse = (forcedId?: string) => {
    const id = (forcedId ?? useTokenId).trim();
    if (!id) return;
    ensureTokenExists(id);

    setTokens((prev) =>
      prev.map((t) => {
        if (t.tokenId !== id) return t;
        return {
          ...t,
          status: "used",
          manufacturer: manufacturerName || "RenewTech",
          // sku/lot 這裡先不寫回 tokens（你要也可以加欄位）
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          {/* ✅ 這行加上 BackToFlow（右側） */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xl font-semibold text-slate-900">
              Multi-Role Console — {demoBatchId}
            </div>
            <BackToFlow />
          </div>

          <div className="text-sm text-slate-600">
            <span className="mr-2">🔗</span>
            <Link
              href="/trace"
              className="underline underline-offset-2 hover:text-slate-900"
            >
              查看鏈上時間線
            </Link>
          </div>
        </div>

        {/* Top Panels */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Process */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">
                🏭 處理廠（Process Token）
              </div>
            </div>

            <ol className="mb-4 space-y-1 text-xs text-slate-600">
              <li>① 從下方 Tokens 複製一個 Token ID</li>
              <li>② 填上處理資訊並按「Process」</li>
              <li>③ 可勾選「自動 Use」同步讓製造端使用</li>
            </ol>

            <div className="grid grid-cols-1 gap-3">
              <Field
                label="Token ID（從下方複製）"
                value={tokenId}
                onChange={setTokenId}
                placeholder="例如：T-1761718898588"
              />
              <Field
                label="處理廠名稱（Processor）"
                value={processorName}
                onChange={setProcessorName}
                placeholder="EcoFactory"
              />
              <Field
                label="產率 yieldRate（0~1）"
                value={yieldRate}
                onChange={setYieldRate}
                placeholder="0.9"
              />
              <Field
                label="耗能 energyKwh"
                value={energyKwh}
                onChange={setEnergyKwh}
                placeholder="30"
              />

              <label className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={autoUse}
                  onChange={(e) => setAutoUse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                處理完成後自動 Use（同步製造端）
              </label>

              <button
                onClick={runProcess}
                className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                → Process & Auto-Use
              </button>

              <div className="mt-1 text-xs text-slate-500">
                * yieldRate / energyKwh 目前為 demo 欄位，用於展示可擴充的 ESG 指標輸入。
              </div>
            </div>
          </div>

          {/* Use */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">
                🧵 製造商（Use Token）
              </div>
            </div>

            <ol className="mb-4 space-y-1 text-xs text-slate-600">
              <li>① 輸入已 processed 的 Token ID</li>
              <li>② 輸入製造資訊並按「Use」</li>
            </ol>

            <div className="grid grid-cols-1 gap-3">
              <Field
                label="Token ID（必須已 processed）"
                value={useTokenId}
                onChange={setUseTokenId}
                placeholder="例如：T-1761718898588"
              />
              <Field
                label="製造商名稱（Manufacturer）"
                value={manufacturerName}
                onChange={setManufacturerName}
                placeholder="RenewTech"
              />
              <Field label="SKU" value={sku} onChange={setSku} placeholder="RB-200" />
              <Field label="LOT" value={lot} onChange={setLot} placeholder="L20251028" />

              <button
                onClick={() => runUse()}
                className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                → Use
              </button>

              <div className="mt-1 text-xs text-slate-500">
                * SKU / LOT 目前為 demo 欄位，用於展示產品綁定資訊。
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Tokens Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">♻️ Tokens（此批次）</div>
            <Badge>{demoBatchId}</Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Token ID</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Material</th>
                  <th className="px-3 py-2 text-left font-semibold">Kg</th>
                  <th className="px-3 py-2 text-left font-semibold">Recycler</th>
                  <th className="px-3 py-2 text-left font-semibold">Processor</th>
                  <th className="px-3 py-2 text-left font-semibold">Manufacturer</th>
                  <th className="px-3 py-2 text-left font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tokens.map((t) => (
                  <tr key={t.tokenId} className="text-slate-800">
                    <td className="px-3 py-2 font-mono text-xs">{t.tokenId}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${statusTone(
                          t.status
                        )}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.material}</td>
                    <td className="px-3 py-2">{t.kg}</td>
                    <td className="px-3 py-2">{t.recycler}</td>
                    <td className="px-3 py-2">{t.processor ?? "-"}</td>
                    <td className="px-3 py-2">{t.manufacturer ?? "-"}</td>
                    <td className="px-3 py-2">
                      <button
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        onClick={() => {
                          setTokenId(t.tokenId);
                          setUseTokenId(t.tokenId);
                        }}
                      >
                        帶入
                      </button>
                    </td>
                  </tr>
                ))}
                {tokens.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={8}>
                      尚無 tokens（demo）
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={() => {
                const id = nowId();
                setTokens((prev) => [
                  {
                    tokenId: id,
                    status: "minted",
                    material: "PET",
                    kg: 20,
                    recycler: "GreenCycle",
                  },
                  ...prev,
                ]);
                setTokenId(id);
                setUseTokenId(id);
              }}
            >
              + 新增 Minted Token（demo）
            </button>

            <button
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={() => setTokens([])}
            >
              清空（demo）
            </button>
          </div>
        </div>

        <Divider />

        {/* Balances */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">💰 Balances（模擬鏈上）</div>
            <Badge>demo</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Object.keys(balances).length === 0 ? (
              <div className="text-sm text-slate-500">目前沒有資料</div>
            ) : (
              Object.entries(balances).map(([mat, total]) => (
                <div key={mat} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-600">Material</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{mat}</div>
                  <div className="mt-2 text-xs text-slate-600">Total Kg</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{total}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            * 這區塊是「展示用」：你之後若要接 smart contract / API，把 balances 改成從鏈上讀即可。
          </div>
        </div>
      </div>
    </div>
  );
}