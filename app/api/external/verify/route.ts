import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * External verification endpoint
 * Third-party systems can verify batch reports without UI.
 *
 * GET /api/external/verify?reportId=...
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_REPORT_ID"
        },
        { status: 400 }
      );
    }

    // 直接呼叫你現有的 verify API
    const base =
      process.env.APP_BASE_URL ||
      "http://localhost:3000";

    const resp = await fetch(
      `${base}/api/verify?reportId=${encodeURIComponent(reportId)}`,
      { cache: "no-store" }
    );

    const data = await resp.json();

    if (!data?.ok) {
      return NextResponse.json({
        ok: false,
        reportId,
        verify: data
      });
    }

    const checks = data.checks || {};
    const batch = data.batchVersion || {};

    const result = {
      ok: true,

      reportId,

      batchId: data.batchId,
      batchVersionHash: data.resolved?.batchVersionHash,

      verification: {
        signature: checks.signatureOk,
        reportPayload: checks.reportPayloadHashMatches,
        batchVersionHash: checks.batchVersionHashMatches,
        ots: checks.otsStatus,
        multiSig: checks.multiSigStatus
      },

      signatures: checks.signatureResults || [],

      ots: {
        status: checks.otsStatus,
        receipt: checks.otsReceiptUrl
      },

      blockchain: batch.onChain || null,

      audit: {
        auditorSigned: checks.auditorSigOk,
        recyclerSigned: checks.recyclerSigOk,
        processorSigned: checks.processorSigOk
      },

      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXTERNAL_VERIFY_FAILED",
        message: String(err?.message || err)
      },
      { status: 500 }
    );
  }
}