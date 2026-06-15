// app/api/verify/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getOtsInfoResult } from "@/lib/ots";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const OTS_DIR = path.join(DATA_DIR, "ots");

/* ---------------- utils ---------------- */

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

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
      : role === "manufacturer"
      ? "MANUFACTURER_PUBLIC_KEY_PEM"
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

function safeVidFromVersion(version: any) {
  const raw =
    String(version?.batch_version_id || version?.batchVersionId || "").trim() ||
    `hash:${String(version?.hash || "").slice(0, 16)}`;

  return raw.replace(/[^\w@.\-:]+/g, "_");
}

function normalizeVersion(v: any) {
  if (!v) return null;

  return {
    ...v,
    batchId: v.batch_id ?? v.batchId,
    batchVersionId: v.batch_version_id ?? v.batchVersionId,
    prevHash: v.prev_hash ?? v.prevHash,
    payloadHash: v.payload_hash ?? v.payloadHash,
    signerName: v.signer_name ?? v.signerName,
    onChain: v.on_chain ?? v.onChain,
  };
}

/* ---------------- Supabase resolvers ---------------- */

async function getReportById(reportId: string) {
  const { data: byId, error: byIdError } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();

  if (byIdError) throw byIdError;
  if (byId) return byId;

  const { data: byReportId, error: byReportIdError } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();

  if (byReportIdError) throw byReportIdError;
  return byReportId;
}

async function resolveBatchVersionByReport({
  report,
  batchIdHint,
  batchVersionHashHint,
  batchVersionIdHint,
}: {
  report: any;
  batchIdHint?: string;
  batchVersionHashHint?: string;
  batchVersionIdHint?: string;
}) {
  const batchId =
    String(batchIdHint || "").trim() ||
    String(report?.batch_id || report?.batchId || report?.batch || "").trim();

  if (!batchId) {
    return { batchId: "", version: null };
  }

  if (batchVersionHashHint) {
    const { data, error } = await supabaseAdmin
      .from("batch_versions")
      .select("*")
      .eq("batch_id", batchId)
      .eq("hash", batchVersionHashHint)
      .maybeSingle();

    if (error) throw error;
    if (data) return { batchId, version: normalizeVersion(data) };
  }

  const batchVersionId =
    String(batchVersionIdHint || "").trim() ||
    String(report?.batch_version_id || report?.batchVersionId || "").trim();

  if (batchVersionId) {
    const { data, error } = await supabaseAdmin
      .from("batch_versions")
      .select("*")
      .eq("batch_id", batchId)
      .eq("batch_version_id", batchVersionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return { batchId, version: normalizeVersion(data) };
  }

  const { data: latest, error: latestError } = await supabaseAdmin
    .from("batch_versions")
    .select("*")
    .eq("batch_id", batchId)
    .order("ts", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  return {
    batchId,
    version: latest ? normalizeVersion(latest) : null,
  };
}

/* ---------------- OTS ---------------- */

async function getOtsInfoByPath(otsAbsPath: string, hashAbsPath?: string) {
  try {
    await fs.access(otsAbsPath);
  } catch {
    return {
      status: "missing",
      verifyError: "OTS_FILE_NOT_FOUND",
      files: {
        hashFile: hashAbsPath ? path.relative(process.cwd(), hashAbsPath) : null,
        otsFile: path.relative(process.cwd(), otsAbsPath),
      },
      receiptUrl: null,
      downloadUrl: null,
    };
  }

  const info = await getOtsInfoResult(otsAbsPath);

  return {
    ...info,
    files: {
      hashFile: hashAbsPath ? path.relative(process.cwd(), hashAbsPath) : null,
      otsFile: path.relative(process.cwd(), otsAbsPath),
    },
    receiptUrl: null,
    downloadUrl: null,
  };
}

async function getOtsForVersion(version: any) {
  const batchId = String(version?.batch_id || version?.batchId || "");
  const safeVid = safeVidFromVersion(version);

  const otsPathRel = version?.ots?.otsPath ? String(version.ots.otsPath) : "";
  const hashPathRel = version?.ots?.hashPath ? String(version.ots.hashPath) : "";

  if (otsPathRel) {
    const otsAbs = path.join(process.cwd(), otsPathRel);
    const hashAbs = hashPathRel ? path.join(process.cwd(), hashPathRel) : undefined;
    return await getOtsInfoByPath(otsAbs, hashAbs);
  }

  const dir = path.join(OTS_DIR, batchId, safeVid);
  const hashAbs = path.join(dir, `${safeVid}.hash`);
  const otsAbs = `${hashAbs}.ots`;

  return await getOtsInfoByPath(otsAbs, hashAbs);
}

/* ---------------- multi-sig helpers ---------------- */

function normalizeSignatures(version: any) {
  if (Array.isArray(version?.signatures) && version.signatures.length > 0) {
    return version.signatures.map((s: any) => ({
      ...s,
      signerName: s.signerName ?? s.signer_name,
    }));
  }

  if (version?.signature) {
    return [
      {
        role: String(version?.signer || "auditor"),
        signer: String(version?.signerDid || "did:web:legacy.local"),
        signerName: String(version?.signerName || version?.signer_name || "legacy"),
        signature: String(version.signature),
        alg: String(version?.alg || "RSA-SHA256"),
        kid: String(version?.kid || "legacy"),
        ts: String(version?.ts || ""),
      },
    ];
  }

  return [];
}

function checkRoleOk(sigs: any[], role: string, hash: string) {
  const targets = sigs.filter((s) => String(s?.role).toLowerCase() === role);

  if (targets.length === 0) {
    return { present: false, ok: null as null | boolean };
  }

  for (const s of targets) {
    const b64 = String(s?.signature || "");
    try {
      if (verifyBase64WithRole(hash, b64, role)) {
        return { present: true, ok: true };
      }
    } catch {
      // keep trying
    }
  }

  return { present: true, ok: false };
}

function buildSignatureResults(sigs: any[], hash: string) {
  const results: Array<{
    role?: string | null;
    signer?: string | null;
    signerName?: string | null;
    alg?: string | null;
    kid?: string | null;
    ts?: string | null;
    ok?: boolean;
    error?: string | null;
  }> = [];

  for (const s of sigs) {
    const role = String(s?.role || "").toLowerCase() || "unknown";
    const signatureB64 = String(s?.signature || "");

    let ok = false;
    let error: string | null = null;

    try {
      ok = verifyBase64WithRole(hash, signatureB64, role);
      if (!ok) error = "SIGNATURE_INVALID";
    } catch (e: any) {
      ok = false;
      error = String(e?.message || e || "VERIFY_ERROR");
    }

    results.push({
      role,
      signer: s?.signer != null ? String(s.signer) : null,
      signerName: s?.signerName != null ? String(s.signerName) : null,
      alg: s?.alg != null ? String(s.alg) : "RSA-SHA256",
      kid: s?.kid != null ? String(s.kid) : null,
      ts: s?.ts != null ? String(s.ts) : s?.signedAt != null ? String(s.signedAt) : null,
      ok,
      error,
    });
  }

  const order = {
    auditor: 0,
    recycler: 1,
    processor: 2,
    manufacturer: 3,
  } as any;

  results.sort((a, b) => (order[a.role || "zzz"] ?? 99) - (order[b.role || "zzz"] ?? 99));

  return results;
}

/* ---------------- API ---------------- */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const reportId = (url.searchParams.get("reportId") || "").trim();
    const batchIdHint = (url.searchParams.get("batchId") || "").trim();
    const batchVersionHashHint = (url.searchParams.get("batchVersionHash") || "").trim();
    const batchVersionIdHint = (url.searchParams.get("batchVersionId") || "").trim();
    const expectReportPayloadHashFromQuery = (
      url.searchParams.get("reportPayloadHash") || ""
    ).trim();

    if (!reportId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", required: ["reportId"] },
        { status: 400 }
      );
    }

    const report = await getReportById(reportId);

    if (!report) {
      return NextResponse.json(
        {
          ok: false,
          error: "REPORT_NOT_FOUND",
          reportId,
          hint: "Check Supabase table: reports.",
        },
        { status: 404 }
      );
    }

    const reportPayload =
      report?.report_payload ??
      report?.reportPayload ??
      report?.payload ??
      report?.reportPayloadJson ??
      null;

    const recomputedReportPayloadHash = sha256Hex(stableJson(reportPayload));

    const expectedReportPayloadHash =
      expectReportPayloadHashFromQuery ||
      String(report?.report_payload_hash || report?.reportPayloadHash || "").trim() ||
      "";

    const { batchId, version } = await resolveBatchVersionByReport({
      report,
      batchIdHint,
      batchVersionHashHint,
      batchVersionIdHint,
    });

    if (!batchId || !version) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_VERSION_NOT_FOUND",
          reportId,
          batchId: batchId || null,
          hint: "Check Supabase table: batch_versions.",
        },
        { status: 404 }
      );
    }

    const hash = String(version?.hash || "");

    const reportPayloadHashMatches =
      !expectedReportPayloadHash ||
      String(expectedReportPayloadHash) === String(recomputedReportPayloadHash);

    const batchVersionHashMatches =
      !batchVersionHashHint || String(hash) === String(batchVersionHashHint);

    const sigs = normalizeSignatures(version);

    const auditor = checkRoleOk(sigs, "auditor", hash);
    const recycler = checkRoleOk(sigs, "recycler", hash);
    const processor = checkRoleOk(sigs, "processor", hash);
    const manufacturer = checkRoleOk(sigs, "manufacturer", hash);

    const signatureOk = auditor.ok === true;

    const multiSigStatus =
      auditor.ok !== true
        ? "fail"
        : recycler.present === false && processor.present === false && manufacturer.present === false
        ? "partial"
        : [recycler, processor, manufacturer]
            .filter((x) => x.present)
            .every((x) => x.ok === true)
        ? "complete"
        : "partial";

    const signatureResults = buildSignatureResults(sigs, hash);

    const ots = await getOtsForVersion(version);

    const otsReceiptUrl = `/api/ots/download?batchId=${encodeURIComponent(
      String(batchId)
    )}&batchVersionHash=${encodeURIComponent(String(hash))}`;

    const otsWithLinks = {
      ...ots,
      batchId: String(batchId),
      batchVersionHash: String(hash),
      receiptUrl: otsReceiptUrl,
      downloadUrl: otsReceiptUrl,
    };

    return NextResponse.json({
      ok: true,
      reportId,
      batchId,
      received: {
        reportId,
        batchId: batchIdHint || null,
        batchVersionHash: batchVersionHashHint || null,
        reportPayloadHash: expectReportPayloadHashFromQuery || null,
        batchVersionId: batchVersionIdHint || null,
      },
      resolved: {
        batchId,
        batchVersionId: String(version.batchVersionId || version.batch_version_id || ""),
        batchVersionHash: String(hash || ""),
      },
      report: {
        stored_report_payload_hash: expectedReportPayloadHash || null,
        recomputed_report_payload_hash: recomputedReportPayloadHash,
        audit_time_iso: report.audit_time_iso ?? null,
        time_source: report.time_source ?? null,
      },
      batchVersion: {
        batchVersionId: version.batchVersionId ?? version.batch_version_id ?? null,
        hash,
        prevHash: version.prevHash ?? version.prev_hash ?? null,
        payloadHash: version.payloadHash ?? version.payload_hash ?? null,
        ts: version.ts ?? null,
        signatures: sigs,
        events: Array.isArray(version?.events) ? version.events : [],
        ots: version.ots ?? null,
        onChain: version.onChain ?? version.on_chain ?? null,
        event: version.event ?? null,
      },
      ots: otsWithLinks,
      checks: {
        signatureOk,
        signatureResults,

        reportPayloadHashMatches,
        batchVersionHashMatches,

        otsFilePresent: ots?.status !== "missing",
        otsStatus: ots?.status || "unknown",
        otsReceiptUrl,

        multiSigStatus,

        auditorSigPresent: auditor.present,
        auditorSigOk: auditor.ok,

        recyclerSigPresent: recycler.present,
        recyclerSigOk: recycler.ok,

        processorSigPresent: processor.present,
        processorSigOk: processor.ok,

        manufacturerSigPresent: manufacturer.present,
        manufacturerSigOk: manufacturer.ok,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "VERIFY_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}