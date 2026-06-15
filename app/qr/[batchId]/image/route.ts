// app/qr/[batchId]/image/route.ts
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { batchId: string } }
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    new URL(req.url).origin;

  const url = `${baseUrl}/trace/${encodeURIComponent(params.batchId)}`;

  const png = await QRCode.toBuffer(url, {
    width: 600,
    margin: 2,
  });

  const pngBody = png.buffer.slice(
    png.byteOffset,
    png.byteOffset + png.byteLength
  ) as ArrayBuffer;

  return new Response(pngBody, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}