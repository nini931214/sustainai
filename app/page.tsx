// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white">
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          {/* LEFT: Hero */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              <img
                src="/brand/logo.png"
                alt="SustainAI"
                className="h-4 w-4 object-contain"
              />
              <span className="font-semibold">SustainAI</span>
              <span className="text-emerald-700/80">循環經濟原型平台</span>
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
              從回收資料到 ESG 數據，<span className="text-emerald-700">一頁掌控</span>。
            </h1>

            <p className="mt-4 max-w-2xl text-slate-600">
              回收商、處理廠、製造商、稽核方、Dashboard、QR 與 AI 報告，全部串在一起，
              示範一條「可追溯、可量化」的循環經濟供應鏈。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99] transition"
              >
                進入 ESG Dashboard
              </Link>

              <Link
                href="/qr"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
              >
                QR 履歷查詢
              </Link>

              <Link
                href="/ai"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100 active:scale-[0.99] transition"
              >
                AI 永續報告生成
              </Link>
            </div>
          </div>

          {/* RIGHT: Stats + Quick entry */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-500">Demo 批次</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">1</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-500">角色節點</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">4</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-500">分析模組</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">3</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">快速入口</div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  href="/recent"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
                >
                  最近批次
                </Link>
                <Link
                  href="/verify"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
                >
                  資料驗證
                </Link>
                <Link
                  href="/flow"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
                >
                  流程總覽
                </Link>
                <Link
                  href="/trace"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
                >
                  追溯查詢
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>SustainAI 🌱</h1>
      <p>循環經濟與 ESG 驗證平台</p>

      <ul style={{ marginTop: 20, lineHeight: 2 }}>
        <li>
          🔍 驗證報告：
          <a href="/verify?reportId=RPT-BATCH-2026-004">
            /verify
          </a>
        </li>

        <li>
          📊 系統健康：
          <a href="/health">
            /health
          </a>
        </li>

        <li>
          🧾 稽核管理：
          <a href="/admin/auditor">
            /admin/auditor
          </a>
        </li>
      </ul>
    </main>
  );
}