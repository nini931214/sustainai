// lib/safeUrl.ts
import type { NextRequest } from "next/server";

/**
 * 安全取得 URL 物件，避免 "The string did not match the expected pattern"
 * 在 Next.js App Router 環境中，req.url 可能是相對路徑（/api/...）
 */
export function getSafeUrl(req: NextRequest): URL {
  try {
    // 若是完整 URL 直接回傳
    return new URL(req.url);
  } catch {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return new URL(req.url, base);
  }
}

/** 方便快速取用 searchParams */
export function getSearchParams(req: NextRequest): URLSearchParams {
  return getSafeUrl(req).searchParams;
}