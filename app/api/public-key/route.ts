// app/api/public-key/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const publicKeyPem = process.env.PUBLIC_KEY_PEM;

  if (!publicKeyPem) {
    return NextResponse.json(
      { ok: false, error: "PUBLIC_KEY_MISSING" },
      { status: 500 }
    );
  }

  // env 裡是單行含 \n，這裡轉回真正 PEM 多行，方便外部直接用
  const pem = publicKeyPem.replace(/\\n/g, "\n");

  return NextResponse.json({
    ok: true,
    keyId: process.env.SIGN_KEY_ID || "auditor-v1",
    alg: "RSA-SHA256",
    publicKeyPem: pem,
  });
}