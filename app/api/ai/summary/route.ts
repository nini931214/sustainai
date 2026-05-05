// app/api/ai/summary/route.ts
import { NextResponse } from "next/server";
import { loadBatch, makeNarrative } from "@/lib/summary";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({}));
    const record = body.record as string;
  if (!record) {
  return NextResponse.json(
    { ok: false, error: "missing record" },
    { status: 400 }
  );
}

const batch = loadBatch(record); // ✅ 這裡改掉
const payload = makeNarrative(batch);

return NextResponse.json({
  ok: true,
  record,
  narrative: payload,
});
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status:500 });
  }
}