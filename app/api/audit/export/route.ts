import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export a full audit record
 *
 * GET /api/audit/export?reportId=...
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_REPORT_ID" },
        { status: 400 }
      );
    }

    const base =
      process.env.APP_BASE_URL ||
      "http://localhost:3000";

    // 1️⃣ 取得 verify 結果
    const verifyResp = await fetch(
      `${base}/api/verify?reportId=${encodeURIComponent(reportId)}`,
      { cache: "no-store" }
    );

    const verify = await verifyResp.json();

    if (!verify?.ok) {
      return NextResponse.json({
        ok: false,
        error: "VERIFY_FAILED",
        verify
      });
    }

    const batch = verify.batchVersion || {};
    const checks = verify.checks || {};

    // 2️⃣ 建立審計報告結構
    const auditReport = {
      reportId,

      batch: {
        batchId: verify.batchId,
        batchVersionId: verify.resolved?.batchVersionId,
        batchVersionHash: verify.resolved?.batchVersionHash
      },

      verification: {
        signatureValid: checks.signatureOk,
        reportIntegrity: checks.reportPayloadHashMatches,
        batchHashMatch: checks.batchVersionHashMatches,
        otsStatus: checks.otsStatus,
        multiSig: checks.multiSigStatus
      },

      signatures: checks.signatureResults || [],

      identities: (checks.signatureResults || []).map((s: any) => ({
        role: s.role,
        signer: s.signer,
        signerName: s.signerName
      })),

      timestamping: {
        otsStatus: checks.otsStatus,
        receipt: checks.otsReceiptUrl
      },

      blockchain: batch.onChain || null,

      auditTrail: batch.events || [],

      generatedAt: new Date().toISOString(),

      schema: "traceability-audit-report/v1"
    };

    return NextResponse.json({
      ok: true,
      auditReport
    });

  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AUDIT_EXPORT_FAILED",
        message: String(err?.message || err)
      },
      { status: 500 }
    );
  }
}