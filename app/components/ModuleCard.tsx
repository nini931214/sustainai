// app/components/ModuleCard.tsx
import Link from "next/link";

export default function ModuleCard({
  title,
  href,
  desc,
}: {
  title: string;
  href: string;
  desc?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold text-slate-900">
          {title}
        </div>
        {desc ? (
          <div className="text-sm text-slate-500">{desc}</div>
        ) : null}
        <div className="mt-3 text-sm font-medium text-emerald-700 opacity-80 group-hover:opacity-100">
          進入 →
        </div>
      </div>
    </Link>
  );
}