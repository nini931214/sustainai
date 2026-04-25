// app/flow/page.tsx
import Link from "next/link";
import Image from "next/image";

type Card = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "orange" | "purple" | "gray" | "pink" | "yellow";
  badge?: string;
};

function toneStyle(tone: Card["tone"]) {
  const common =
    "rounded-2xl border p-5 shadow-sm transition hover:shadow-md hover:-translate-y-[1px] bg-white";
  const toneMap: Record<Card["tone"], string> = {
    green: "border-emerald-200 hover:border-emerald-300",
    blue: "border-sky-200 hover:border-sky-300",
    orange: "border-orange-200 hover:border-orange-300",
    purple: "border-violet-200 hover:border-violet-300",
    gray: "border-slate-200 hover:border-slate-300",
    pink: "border-pink-200 hover:border-pink-300",
    yellow: "border-amber-200 hover:border-amber-300",
  };
  return `${common} ${toneMap[tone]}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-10 mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-wide text-slate-700">
        {title}
      </h2>
      <div className="h-px flex-1 bg-slate-200/80 ml-4" />
    </div>
  );
}

function TopBrand() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/logo.png"
        alt="SustainAI Logo"
        width={24}
        height={24}
        className="h-6 w-6"
      />
      <div className="text-lg font-bold text-slate-900">SustainAI</div>
      <div className="hidden md:inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
        循環經濟流程總覽
      </div>
    </div>
  );
}

function FlowStrip() {
  const items = [
    { k: "Recycle", t: "回收商建立原始批次與重量", icon: "♻️" },
    { k: "Process", t: "處理廠將廢料轉為再生料", icon: "🏭" },
    { k: "Manufacture", t: "製造商把再生料用到產品上", icon: "🧵" },
    { k: "Audit & Data", t: "稽核與 Dashboard / AI 報告", icon: "🔎" },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          🔁
        </span>
        流程總覽
        <span className="ml-2 text-xs font-normal text-slate-500">
          Recycle → Process → Manufacture → Audit → Insights
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        {items.map((it, idx) => (
          <div
            key={it.k}
            className="relative rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {it.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{it.k}</div>
                <div className="mt-1 text-xs text-slate-600">{it.t}</div>
              </div>
            </div>

            {idx < items.length - 1 ? (
              <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300">
                →
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGrid({ cards, cols = 4 }: { cards: Card[]; cols?: 3 | 4 }) {
  const gridCols = cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
      {cards.map((c) => (
        <Link key={c.title} href={c.href} className={toneStyle(c.tone)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {c.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold text-slate-900">
                    {c.title}
                  </div>
                  {c.badge ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {c.badge}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-600">
                  {c.desc}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs font-semibold text-emerald-700">
            進入 →
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function FlowPage() {
  const roleCards: Card[] = [
    {
      title: "回收商入口",
      desc: "新增回收批次，輸入重量與來源。",
      href: "/admin/recycler",
      icon: "♻️",
      tone: "green",
    },
    {
      title: "處理廠入口",
      desc: "更新再生料資訊與加工狀態。",
      href: "/admin/processor",
      icon: "🏭",
      tone: "blue",
    },
    {
      title: "製造商入口",
      desc: "將再生料導入產品並綁定批次。",
      href: "/admin/manufacturer",
      icon: "🧵",
      tone: "orange",
    },
    {
      title: "稽核方入口",
      desc: "查看並驗證批次完整度。",
      href: "/admin/auditor",
      icon: "🔎",
      tone: "purple",
    },
  ];

  const toolCards: Card[] = [
    {
  title: "Multi-Role Console",
  desc: "Mint → Process → Use，一頁式流程操作。",
  href: "/admin", // ✅ 回到你原本那個完整 Console 頁
  icon: "⚙️",
  tone: "gray",
  badge: "DEMO",
},
    {
      title: "批次履歷清單",
      desc: "查看所有批次與 QR 履歷摘要。",
      href: "/recent",
      icon: "🧾",
      tone: "blue",
    },
    {
      title: "ESG Dashboard",
      desc: "碳排、回收量、再利用率一覽。",
      href: "/dashboard",
      icon: "📊",
      tone: "pink",
    },
    {
      title: "追溯 / 查詢",
      desc: "依批次 / 產品查詢追溯鏈資料。",
      href: "/trace",
      icon: "🧭",
      tone: "yellow",
    },
  ];

  const aiCards: Card[] = [
    {
      title: "AI 永續聲明生成器",
      desc: "自動生成 ESG / 永續報告文字段落。",
      href: "/ai",
      icon: "🤖",
      tone: "blue",
      badge: "NLP DEMO",
    },
    {
      title: "QR 履歷頁入口",
      desc: "掃描 QR Code，瀏覽批次追溯可視化。",
      href: "/qr",
      icon: "🔍",
      tone: "green",
    },
    {
      title: "實驗模組（保留位）",
      desc: "未來可放監控模組 / AI 推薦模組等。",
      href: "/experimental",
      icon: "🧪",
      tone: "gray",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-2">
          <TopBrand />
          <div className="text-sm text-slate-600">
            這一頁整合所有角色入口與系統模組，方便 demo 直接切換。
          </div>
        </div>

        <FlowStrip />

        <SectionHeader title="角色入口" />
        <CardGrid cards={roleCards} cols={4} />

        <SectionHeader title="系統工具" />
        <CardGrid cards={toolCards} cols={4} />

        <SectionHeader title="AI 模組" />
        <CardGrid cards={aiCards} cols={3} />

        <div className="h-10" />
      </div>
    </div>
  );
}