// app/api/batch/update-role/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBatchById, saveBatch } from "@/lib/chain"; 
// ⚠️ 你目前 lib/chain.ts 是否有 saveBatch 不確定：
// 如果沒有，先照下面註解做「最小新增」版本（我後面有給）。

const ROLES = ["recycler", "processor", "manufacturer", "auditor"] as const;
type Role = (typeof ROLES)[number];

export async function POST(req: Request) {
  const roleCookie = cookies().get("sustainai_role")?.value as Role | undefined;

  if (!roleCookie || !ROLES.includes(roleCookie)) {
    return NextResponse.json({ ok: false, error: "NO_ROLE" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as
    | { batchId?: string; role?: Role; patch?: any }
    | null;

  if (!body?.batchId || !body?.role || body.patch == null) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // 伺服器端強制：cookie 角色必須等於你宣稱要寫入的 role
  if (body.role !== roleCookie) {
    return NextResponse.json({ ok: false, error: "ROLE_MISMATCH" }, { status: 403 });
  }

  const batch = getBatchById(body.batchId);
  if (!batch) {
    return NextResponse.json({ ok: false, error: "BATCH_NOT_FOUND" }, { status: 404 });
  }

  // ✅ 只更新該角色的 section，不允許覆蓋整包 batch
  const next = {
    ...batch,
    [roleCookie]: {
      ...(batch as any)[roleCookie],
      ...body.patch,
    },
    // 可選：留下更新時間（稽核加分）
    updated_at: new Date().toISOString(),
  };

  saveBatch(next); // ⚠️ 如果你還沒有這個函式，往下看我給你的最小實作

  return NextResponse.json({ ok: true });
}