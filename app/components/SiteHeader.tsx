"use client";

import BrandLogo from "./BrandLogo";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* 左側 Logo */}
        <BrandLogo />

        {/* 右側導覽 */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-green-600">
            首頁
          </Link>
          <Link href="/dashboard" className="hover:text-green-600">
            ESG Dashboard
          </Link>
          <Link href="/ai" className="hover:text-green-600">
            AI 模組
          </Link>
        </nav>
      </div>
    </header>
  );
}