import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(
  _req: Request,
  { params }: { params: { batchId: string } }
) {
  const id = decodeURIComponent(params.batchId);

  // QR 內容：掃到後要去的公開履歷頁（你可以改成 /trace 或 /qr 的任一種）
  // 建議：掃 QR 進 /trace 才是「外部看履歷」
  const target = `/trace/${encodeURIComponent(id)}`;

  // 這裡做成 PNG
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