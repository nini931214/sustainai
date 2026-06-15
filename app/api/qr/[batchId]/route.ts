// app/api/qr/[batchId]/route.ts
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { batchId: string } }
) {
  const id = decodeURIComponent(params.batchId);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    new URL(req.url).origin;

  const target = `${baseUrl}/trace/${encodeURIComponent(id)}`;

  const pngBuffer = await QRCode.toBuffer(target, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const arrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength
  ) as ArrayBuffer;

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}