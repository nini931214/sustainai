// app/api/trace/[record]/route.ts
import { NextResponse } from "next/server";
import { getBatchById } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    record: string;
  };
};

export async function GET(
  _req: Request,
  { params }: RouteParams
) {
  const record = decodeURIComponent(params.record);

  const batch = await getBatchById(record);

  if (!batch) {
    return NextResponse.json(
      {
        ok: false,
        error: "BATCH_NOT_FOUND",
        record,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    record: batch,
    batch,
  });
}