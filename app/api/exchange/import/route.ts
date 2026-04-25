import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stableJson(obj: any) {
  const sortKeys = (x: any): any => {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === "object") {
      return Object.keys(x)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = sortKeys(x[k]);
          return acc;
        }, {});
    }
    return x;
  };
  return JSON.stringify(sortKeys(obj));
}

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function readPemFromEnv(key: string) {
  const v = process.env[key];
  if (!v) return "";
  return v.replace(/\\n/g, "\n");
}

function verifyBase64WithRole(message: string, signatureB64: string, role: string) {
  if (!signatureB64) return false;

  const roleKey =
    role === "auditor"
      ? "AUDITOR_PUBLIC_KEY_PEM"
      : role === "recycler"
      ? "RECYCLER_PUBLIC_KEY_PEM"
      : role === "processor"
      ? "PROCESSOR_PUBLIC_KEY_PEM"
      : "";

  const pub =
    (roleKey ? readPemFromEnv(roleKey) : "") ||
    readPemFromEnv("PUBLIC_KEY_PEM");

  if (!pub) throw new Error("PUBLIC_KEY_MISSING");

  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(message, "utf8"),
    pub,
    Buffer.from(signatureB64, "base64")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const bundle = body?.bundle || body;

    if (!bundle || String(bundle?.schema || "") !== "proof-bundle/v1") {
      return NextResponse.json(
        { ok: false, error: "INVALID_BUNDLE_SCHEMA" },
        { status: 400 }
      );
    }

    const report = bundle?.report || null;
    const version = bundle?.version || null;
    const batch = bundle?.batch || null;

    if (!report || !version || !batch) {
      return NextResponse.json(
        { ok: false, error: "INCOMPLETE_BUNDLE" },
        { status: 400 }
      );
    }

    const recomputedPayloadHash = sha256Hex(stableJson(batch));
    const payloadHashMatches =
      String(version?.payloadHash || "") === recomputedPayloadHash;

    const signatures: any[] = Array.isArray(version?.signatures) ? version.signatures : [];

    const signatureResults = signatures.map((s) => {
      const role = String(s?.role || "");
      const signature = String(s?.signature || "");
      try {
        const ok = verifyBase64WithRole(String(version?.hash || ""), signature, role);
        return {
          role,
          signer: s?.signer || s?.did || null,
          signerName: s?.signerName || null,
          ok,
          error: ok ? null : "SIGNATURE_INVALID",
        };
      } catch (e: any) {
        return {
          role,
          signer: s?.signer || s?.did || null,
          signerName: s?.signerName || null,
          ok: false,
          error: String(e?.message || e),
        };
      }
    });

    const auditorOk = signatureResults.some(
      (r) => r.role === "auditor" && r.ok === true
    );

    return NextResponse.json({
      ok: true,
      importedAt: new Date().toISOString(),
      result: {
        batchId: bundle?.batchId || null,
        reportId: bundle?.reportId || null,
        payloadHashMatches,
        auditorOk,
        signatureResults,
        ots: version?.ots || null,
        onChain: version?.onChain || null,
        events: Array.isArray(version?.events) ? version.events : [],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXCHANGE_IMPORT_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}