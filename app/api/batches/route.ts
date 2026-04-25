import { NextResponse } from "next/server";
import { listBatches } from "@/lib/chain";

export const runtime = "nodejs";

export async function GET() {
  const batches = listBatches();
  return NextResponse.json({ batches });
}