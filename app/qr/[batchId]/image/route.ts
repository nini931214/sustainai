// app/qr/[batchId]/image/route.ts
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_BASE_URL = "https://sustainai-gilt.vercel.app";

export async function GET(
  _req: Request,
  { params }: { params: { batchId: string } }
) {
  const id = decodeURIComponent(params.batchId);
  const url = `${PUBLIC_BASE_URL}/trace/${encodeURIComponent(id)}`;

  const png = await QRCode.toBuffer(url, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const pngBody = png.buffer.slice(
    png.byteOffset,
    png.byteOffset + png.byteLength
  ) as ArrayBuffer;

  return new Response(pngBody, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-QR-Target": url,
    },
  });
}