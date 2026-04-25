"use client";

import Link from "next/link";

const DEFAULT_BATCH_ID = "BATCH-2025-001";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* 🔹 Banner + Logo */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm ring-1 ring-emerald-100">
              <img
  src="/brand/logo.png"
  alt="SustainAI Logo"
  className="w-8 h-8 object-contain"
/>
              <span className="text-slate-400">｜循環經濟原型平台</span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              從回收資料到 ESG 數據，
              <span className="text-emerald-600"> 一頁掌控。</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-xl">
              回收商、處理廠、製造商、稽核方、Dashboard、QR 與 AI 報告，
              全部串在一起，示範一條「可追溯、可量化」的循環經濟供應鏈。
            </p>
          </div>

          {/* 小統計區（純視覺用） */}
          <div className="grid grid-cols-3 gap-3 sm:w-64">
            <MiniStat label="Demo 批次" value="1" />
            <MiniStat label="角色節點" value="4" />
            <MiniStat label="分析模組" value="3" />
          </div>
        </header>

        {/* 🔹 流程圖：Recycle → Process → Manufacture */}
        <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span>🔄 流程總覽</span>
            <span className="text-[11px] font-normal text-slate-400">
              Recycle → Process → Manufacture → Audit → Insights
            </span>
          </h2>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <FlowStep
              icon="♻️"
              title="Recycle"
              desc="回收商建立原始批次與重量。"
            />
            <FlowArrow />
            <FlowStep
              icon="🏭"
              title="Process"
              desc="處理廠將廢料轉為再生料。"
            />
            <FlowArrow />
            <FlowStep
              icon="🧵"
              title="Manufacture"
              desc="製造商把再生料用到產品上。"
            />
            <FlowArrow />
            <FlowStep
              icon="🔍"
              title="Audit & Data"
              desc="稽核與 Dashboard / AI 報告。"
            />
          </div>
        </section>

                {/* 🔹 角色入口區 */}
        <Section title="角色入口">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <GradientCard
              gradient="from-emerald-400 via-emerald-500 to-teal-500"
              icon="♻️"
              title="回收商入口"
              desc="新增回收批次，輸入重量與來源。"
              href="/admin/recycler"              // ← 這裡改成 admin
            />
            <GradientCard
              gradient="from-sky-400 via-sky-500 to-blue-600"
              icon="🏭"
              title="處理廠入口"
              desc="更新再生料資訊與加工狀態。"
              href="/admin/processor"             // ← 這裡改成 admin
            />
            <GradientCard
              gradient="from-amber-400 via-orange-500 to-rose-500"
              icon="🧵"
              title="製造商入口"
              desc="將再生料導入產品並綁定批次。"
              href="/admin/manufacturer"          // ← 這裡改成 admin
            />
            <GradientCard
              gradient="from-violet-400 via-purple-500 to-indigo-500"
              icon="🔍"
              title="稽核方入口"
              desc="查看並驗證批次完整度。"
              href={`/auditor?batchId=${DEFAULT_BATCH_ID}`}
            />
          </div>
        </Section>
        
        {/* 🔹 系統工具區 */}
        <Section title="系統工具">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <GradientCard
              gradient="from-slate-500 via-slate-600 to-slate-800"
              icon="⚙️"
              title="Multi-Role Console"
              desc="Mint → Process → Use 一頁式全流程。"
              href={`/flow/${DEFAULT_BATCH_ID}`}
              badge="Demo 主控台"
            />
            <GradientCard
              gradient="from-cyan-400 via-cyan-500 to-teal-500"
              icon="🪵"
              title="批次履歷清單"
              desc="查看所有批次與 QR 履歷連結。"
              href="/recent"
            />
            <GradientCard
              gradient="from-fuchsia-400 via-pink-500 to-rose-500"
              icon="📊"
              title="ESG Dashboard"
              desc="碳排、回收量、再利用率一眼看。"
              href="/dashboard"
            />
            <GradientCard
              gradient="from-amber-500 via-yellow-500 to-lime-400"
              icon="🛡️"
              title="驗章 / 簽章"
              desc="輸入批次 ID 驗證狀態（模擬鏈上）。"
              href="/verify"
            />
          </div>
        </Section>

        {/* 🔹 AI 模組區 */}
        <Section title="AI 模組">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <GradientCard
              gradient="from-indigo-400 via-blue-500 to-sky-500"
              icon="🤖"
              title="AI 永續聲明生成器"
              desc="自動生成 ESG / 永續報告文字段落。"
              href="/ai"
              badge="NLP Demo"
            />
            <GradientCard
              gradient="from-teal-400 via-emerald-500 to-green-500"
              icon="📎"
              title="QR 履歷頁入口"
              desc="搭配 QR Code ，讓外部掃描即可查看。"
              href={`/trace/${encodeURIComponent(DEFAULT_BATCH_ID)}`}
            />
            <GradientCard
              gradient="from-slate-400 via-slate-500 to-slate-700"
              icon="🧪"
              title="實驗模組（保留位）"
              desc="未來可以放碳足跡優化、供應鏈模擬等。"
              href="/experimental"
            />
          </div>
        </Section>
      </div>
    </main>
  );
}

/* --------------------------------- 小元件們 --------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700">
          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-300/80 via-slate-200 to-transparent" />
      </div>
      {children}
    </section>
  );
}

function GradientCard(props: {
  gradient: string;
  icon: string;
  title: string;
  desc: string;
  href: string;
  badge?: string;
}) {
  const { gradient, icon, title, desc, href, badge } = props;

  return (
    <Link href={href} className="block h-full">
      <div
        className={`group h-full rounded-2xl bg-gradient-to-br ${gradient} p-[1px] shadow-sm hover:shadow-xl transition-shadow duration-300 ease-out`}
      >
        <div
          className="
            h-full min-h-[180px]       /* ⬅ 固定最小高度 */
            rounded-2xl bg-white/90
            backdrop-blur-sm p-5
            flex flex-col justify-between
          "
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl translate-y-0.5 group-hover:-translate-y-1 transition-transform duration-300 ease-out">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  {title}
                </h3>
                {badge && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-900 text-slate-100">
                    {badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                {desc}
              </p>
            </div>
          </div>

          <span className="mt-4 inline-flex items-center text-xs font-medium text-emerald-700 group-hover:text-emerald-800 transition-colors">
            進入 →
          </span>
        </div>
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/90 px-3 py-2 text-center shadow-sm ring-1 ring-slate-200">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function FlowStep({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl">
        {icon}
      </div>
      <div className="text-xs sm:text-sm">
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="text-[11px] text-slate-500">{desc}</div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden sm:flex flex-1 justify-center">
      <div className="flex items-center gap-1 text-slate-300">
        <span className="h-px w-10 bg-slate-300" />
        <span className="text-xs">➜</span>
        <span className="h-px w-10 bg-slate-300" />
      </div>
    </div>
  );
}