"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/flow";

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12 flex items-center justify-center">
      <div className="max-w-2xl w-full rounded-3xl bg-white p-10 shadow-lg border">
        <p className="text-sm font-semibold text-gray-500 mb-3">
          SustainAI Circular ESG Platform
        </p>

        <h1 className="text-4xl font-bold mb-4">
          歡迎使用 SustainAI
        </h1>

        <p className="text-gray-600 leading-8 mb-8">
          SustainAI 是一個結合循環經濟、ESG 驗證、AI 分析與版本追溯的管理平台，
          協助企業建立可信賴的永續資料管理流程。
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {["ESG 驗證", "AI 分析", "QR Trace", "Version Chain"].map((item) => (
            <div key={item} className="rounded-2xl border p-4 text-gray-700">
              ✓ {item}
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-6">
          使用本平台前，請先閱讀並同意《服務條款暨隱私權政策》。
        </p>

        <button
          onClick={() => router.push(`/terms?next=${encodeURIComponent(next)}`)}
          className="w-full rounded-2xl bg-black px-6 py-4 text-white font-semibold hover:bg-gray-800"
        >
          閱讀服務條款
        </button>
      </div>
    </main>
  );
}