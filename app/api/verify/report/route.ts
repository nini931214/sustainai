// app/api/verify/report/route.ts
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function readJson(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function verifySigBase64(message: string, signatureBase64: string) {
  const pub = process.env.PUBLIC_KEY_PEM;
  if (!pub) throw new Error("PUBLIC_KEY_MISSING");
  const pem = pub.replace(/\\n/g, "\n");

  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(message, "utf8"),
    pem,
    Buffer.from(signatureBase64, "base64")
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = (url.searchParams.get("reportId") || "").trim();

    if (!reportId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_REPORT_ID" },
        { status: 400 }
      );
    }

    const reportsDb = await readJson(REPORTS_FILE, { reports: [] });
    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];
    const report = reports.find((r) => String(r?.id) === reportId);

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "REPORT_NOT_FOUND", reportId },
        { status: 404 }
      );
    }

    const batchId = String(report.batchId || "");
    const batchVersionId = String(report.batchVersionId || "");
    const reportPayloadHashOnFile = String(report.report_payload_hash || "");

    const versionsDb = await readJson(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(versionsDb?.records)
      ? versionsDb.records
      : Array.isArray(versionsDb)
        ? versionsDb
        : [];

    const sameBatch = records.filter((r) => String(r?.batchId) === batchId);
    const entry = sameBatch.find((r) => String(r?.batchVersionId) === batchVersionId);

    if (!entry) {
      return NextResponse.json({
        ok: true,
        reportId,
        batchId,
        batchVersionId,
        reportPayloadHashOnFile,
        chainValid: false,
        chainReason: "BATCH_VERSION_NOT_FOUND",
        chainLength: sameBatch.length,
        signature: null,
        approvedBy: report?.approvedBy || null,
      });
    }

    const prevHash = entry.prevHash ?? "";
    const payloadHash = String(entry.payloadHash || "");
    const signature = String(entry.signature || "");
    const alg = String(entry.alg || "RSA-SHA256");

    // ✅ 重新算出「應該的 chainHash」
    const expectedChainHash = sha256Hex(`${prevHash}|${payloadHash}|${batchVersionId}`);

    let sigOk = false;
    let reason: string | null = null;

    if (!signature) {
      sigOk = false;
      reason = "SIGNATURE_MISSING";
    } else if (alg !== "RSA-SHA256") {
      sigOk = false;
      reason = "UNSUPPORTED_ALG";
    } else {
      try {
        sigOk = verifySigBase64(expectedChainHash, signature);
        reason = sigOk ? null : "SIGNATURE_INVALID";
      } catch (e: any) {
        sigOk = false;
        reason = `VERIFY_ERROR:${String(e?.message || e)}`;
      }
    }

    return NextResponse.json({
      ok: true,
      reportId,
      batchId,
      batchVersionId,

      auditorStatus: report?.auditorStatus || null,
      approvedBy: report?.approvedBy || null,

      reportPayloadHashOnFile,
      batchVersionPayloadHash: payloadHash,

      // ✅ 核心：有簽名且驗過才算 valid
      chainValid: sigOk,
      chainReason: reason,
      chainLength: sameBatch.length,

      signature: signature ? `${signature.slice(0, 18)}...` : null,
      signer: entry.signer ?? null,
      signerName: entry.signerName ?? null,
      alg,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "VERIFY_REPORT_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}