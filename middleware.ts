import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_PATHS = ["recycler", "processor", "manufacturer", "auditor"] as const;

const TERMS_COOKIE = "sustainai_terms_accepted";
const TERMS_VERSION = "V2.0_2026_06";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const publicPaths =
    pathname === "/welcome" ||
    pathname === "/terms" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!publicPaths) {
    const accepted = req.cookies.get(TERMS_COOKIE)?.value;

    if (accepted !== TERMS_VERSION) {
      const url = req.nextUrl.clone();
      url.pathname = "/welcome";
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  const hitRole = ROLE_PATHS.find(
    (r) => pathname === `/${r}` || pathname.startsWith(`/${r}/`)
  );

  if (!hitRole) return NextResponse.next();

  const currentRole = req.cookies.get("sustainai_role")?.value;

  if (!currentRole) {
    return NextResponse.redirect(new URL("/flow", req.url));
  }

  if (currentRole !== hitRole) {
    return NextResponse.redirect(new URL("/flow", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};