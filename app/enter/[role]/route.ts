// app/enter/[role]/route.ts
import { NextResponse } from "next/server";

const ROLES = ["recycler", "processor", "manufacturer", "auditor"] as const;

export async function GET(
  _req: Request,
  { params }: { params: { role: string } }
) {
  const role = params.role;

  if (!ROLES.includes(role as any)) {
    return NextResponse.redirect(new URL("/flow", _req.url));
  }

  // 寫入角色 cookie
  const res = NextResponse.redirect(new URL(`/${role}`, _req.url));
  res.cookies.set("sustainai_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}