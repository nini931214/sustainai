// app/qr/[batchId]/image/route.ts
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { batchId: string } }
) {
  const id = decodeURIComponent(params.batchId);
  const baseUrl = new URL(req.url).origin;

  const url = `${baseUrl}/trace/${encodeURIComponent(id)}`;

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
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}