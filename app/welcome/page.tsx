"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/flow";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-2xl rounded-3xl border bg-white p-10 shadow-lg">
        <p className="mb-3 text-sm font-semibold text-gray-500">
          SustainAI Circular ESG Platform
        </p>

        <h1 className="mb-4 text-4xl font-bold">歡迎使用 SustainAI</h1>

        <p className="mb-8 leading-8 text-gray-600">
          SustainAI 是一個結合循環經濟、ESG 驗證、AI 分析與版本追溯的管理平台，
          協助企業建立可信賴的永續資料管理流程。
        </p>

        <div className="mb-8 grid grid-cols-2 gap-4">
          {["ESG 驗證", "AI 分析", "QR Trace", "Version Chain"].map((item) => (
            <div key={item} className="rounded-2xl border p-4 text-gray-700">
              ✓ {item}
            </div>
          ))}
        </div>

        <p className="mb-6 text-sm text-gray-500">
          使用本平台前，請先閱讀並同意《服務條款暨隱私權政策》。
        </p>

        <button
          onClick={() => router.push(`/terms?next=${encodeURIComponent(next)}`)}
          className="w-full rounded-2xl bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800"
        >
          閱讀服務條款
        </button>
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  );
}