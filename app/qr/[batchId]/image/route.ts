// app/qr/[batchId]/image/route.ts
import QRCode from "qrcode";

export async function GET(
  req: Request,
  { params }: { params: { batchId: string } }
) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/trace/${params.batchId}`;

  const png = await QRCode.toBuffer(url, {
    width: 600,
    margin: 2,
  });

const pngBody = png.buffer.slice(
  png.byteOffset,
  png.byteOffset + png.byteLength
) as ArrayBuffer;

return new Response(new Blob([pngBody], { type: "image/png" }), {
  headers: {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
  },
});
}