import { NextResponse } from "next/server";
import { listBatches, getBatchById } from "@/lib/chain";
import { buildReportDoc } from "@/lib/report/buildReportDoc";
import { generateReportPdf } from "@/lib/report/pdf/generateReportPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const batchId = searchParams.get("batch") || undefined;

    const batches = listBatches();
    const batch =
      (batchId && getBatchById(batchId)) ||
      (batches.length > 0 ? batches[0] : undefined);

    if (!batch) {
      return NextResponse.json(
        { ok: false, error: "NO_BATCH", message: "No batch data found." },
        { status: 404 }
      );
    }

const doc = buildReportDoc({
      batch,
      origin,
      generatedAt: new Date().toISOString().slice(0, 10),
    });

    const { pdfBytes, filename } = await generateReportPdf({
      batchId: doc.meta.batchId,
      material: doc.meta.material,
      traceUrl: doc.meta.traceUrl,
      title: "SustainAI｜永續報告書（示範）",
      sections: doc.sections,
    });

    const pdfArrayBuffer = pdfBytes.buffer.slice(
  pdfBytes.byteOffset,
  pdfBytes.byteOffset + pdfBytes.byteLength
) as ArrayBuffer;

return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename.replace(
          ".pdf",
          "-CN.pdf"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PDF_GEN_FAILED",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}