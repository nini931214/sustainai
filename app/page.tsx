// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white">
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              <img src="/brand/logo.png" alt="SustainAI" className="h-4 w-4 object-contain" />
              <span className="font-semibold">SustainAI</span>
              <span className="text-emerald-700/80">循環經濟 ESG 驗證平台</span>
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
              從回收資料到 ESG 稽核，<span className="text-emerald-700">一站式追溯驗證</span>。
            </h1>

            <p className="mt-4 max-w-2xl text-slate-600">
              串接回收商、處理廠、製造商與稽核方，透過 append-only 版本鏈、簽章、OTS
              時間戳與鏈上錨定，讓循環經濟資料可追溯、可驗證、不可悄悄竄改。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition">
                進入 ESG Dashboard
              </Link>
              <Link href="/health" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition">
                System Health
              </Link>
              <Link href="/verify?reportId=RPT-BATCH-2026-004" className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100 transition">
                公開驗證頁
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-500">角色節點</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">4</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-500">驗證模組</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">5</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-500">Pipeline</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">Auto</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">快速入口</div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/recent" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition">
                  最近批次
                </Link>
                <Link href="/verify?reportId=RPT-BATCH-2026-004" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition">
                  資料驗證
                </Link>
                <Link href="/flow" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition">
                  流程總覽
                </Link>
                <Link href="/admin/auditor" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition">
                  稽核入口
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}