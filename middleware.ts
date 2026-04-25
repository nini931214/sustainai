// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_PATHS = ["recycler", "processor", "manufacturer", "auditor"] as const;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 只管角色頁路由
  const hitRole = ROLE_PATHS.find((r) => pathname === `/${r}` || pathname.startsWith(`/${r}/`));
  if (!hitRole) return NextResponse.next();

  const currentRole = req.cookies.get("sustainai_role")?.value;

  // 沒有角色 cookie：代表沒從入口進 → 踢回流程總覽
  if (!currentRole) {
    return NextResponse.redirect(new URL("/flow", req.url));
  }

  // 有 cookie 但角色不符：踢回流程總覽（或你想導回 /enter/{currentRole} 也可）
  if (currentRole !== hitRole) {
    return NextResponse.redirect(new URL("/flow", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/recycler/:path*", "/processor/:path*", "/manufacturer/:path*", "/auditor/:path*"],
};