// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "SustainAI",
  description: "循環經濟 × ESG × AI 數據平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-slate-50 text-slate-900">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}