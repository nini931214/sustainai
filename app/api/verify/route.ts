// app/api/verify/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getOtsInfoResult } from "@/lib/ots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");
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

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
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
    readPemFromEnv("PUBLIC_KEY_PEM"); // fallback

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
    String(version?.batchVersionId || "").trim() ||
    `hash:${String(version?.hash || "").slice(0, 16)}`;
  return raw.replace(/[^\w@.\-:]+/g, "_");
}

function resolveReportId(r: any) {
  return String(r?.id || r?.reportId || r?.report_id || "");
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
  const batchId = String(version?.batchId || "");
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

/* ---------------- resolver ---------------- */

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
  const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
  const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

  const batchId =
    String(batchIdHint || "").trim() ||
    String(report?.batchId || report?.batch_id || report?.batch || "").trim();

  if (batchId && batchVersionHashHint) {
    const byHash =
      records.find(
        (r) =>
          String(r?.batchId) === String(batchId) &&
          String(r?.hash || "") === String(batchVersionHashHint)
      ) || null;
    if (byHash) return { batchId, version: byHash };
  }

  const batchVersionId =
    String(batchVersionIdHint || "").trim() ||
    String(report?.batchVersionId || report?.batch_version_id || "").trim();

  if (batchId && batchVersionId) {
    const byVid =
      records.find(
        (r) =>
          String(r?.batchId) === String(batchId) &&
          String(r?.batchVersionId || "") === String(batchVersionId)
      ) || null;
    if (byVid) return { batchId, version: byVid };
  }

  if (batchId) {
    const same = records.filter((r) => String(r?.batchId) === String(batchId));
    same.sort((a, b) => Number(new Date(b?.ts || 0)) - Number(new Date(a?.ts || 0)));
    if (same[0]) return { batchId, version: same[0] };
  }

  return { batchId, version: null };
}

/* ---------------- multi-sig helpers ---------------- */

function normalizeSignatures(version: any) {
  // ✅ 新版
  if (Array.isArray(version?.signatures) && version.signatures.length > 0) {
    return version.signatures;
  }
  // ✅ 舊版 fallback
  if (version?.signature) {
    return [
      {
        role: String(version?.signer || "auditor"),
        signer: String(version?.signerDid || "did:web:legacy.local"),
        signerName: String(version?.signerName || "legacy"),
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
  const targets = sigs.filter((s) => String(s?.role) === role);
  if (targets.length === 0) return { present: false, ok: null as null | boolean };

  for (const s of targets) {
    const b64 = String(s?.signature || "");
    try {
      if (verifyBase64WithRole(hash, b64, role)) return { present: true, ok: true };
    } catch {
      // keep trying
    }
  }
  return { present: true, ok: false };
}

function buildSignatureResults(sigs: any[], hash: string) {
  // ✅ 逐筆驗證，回給 UI 顯示（role/signerName/kid/ts/ok/error）
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
      ts: s?.ts != null ? String(s.ts) : (s?.signedAt != null ? String(s.signedAt) : null),
      ok,
      error,
    });
  }

  // ✅ UI 友善：固定順序（auditor/recycler/processor 在前）
  const order = { auditor: 0, recycler: 1, processor: 2 } as any;
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
    const expectReportPayloadHashFromQuery = (url.searchParams.get("reportPayloadHash") || "").trim();

    if (!reportId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", required: ["reportId"] },
        { status: 400 }
      );
    }

    /* ---------- report ---------- */
    const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });
    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];
    const report = reports.find((r) => resolveReportId(r) === reportId) || null;

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "REPORT_NOT_FOUND", reportId, hint: "Check data/reports.json." },
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
      String(report?.report_payload_hash || "").trim() ||
      "";

    /* ---------- batch version resolve ---------- */
    const { batchId, version } = await resolveBatchVersionByReport({
      report,
      batchIdHint,
      batchVersionHashHint,
      batchVersionIdHint,
    });

    if (!batchId || !version) {
      return NextResponse.json(
        { ok: false, error: "BATCH_VERSION_NOT_FOUND", reportId, batchId: batchId || null },
        { status: 404 }
      );
    }

    /* ---------- checks ---------- */
    const reportPayloadHashMatches =
      !expectedReportPayloadHash ||
      String(expectedReportPayloadHash) === String(recomputedReportPayloadHash);

    const batchVersionHashMatches =
      !batchVersionHashHint || String(version.hash || "") === String(batchVersionHashHint);

    // ✅ 多角色簽章（含 signatureResults 給 UI）
    const sigs = normalizeSignatures(version);
    const hash = String(version?.hash || "");

    const auditor = checkRoleOk(sigs, "auditor", hash);
    const recycler = checkRoleOk(sigs, "recycler", hash);
    const processor = checkRoleOk(sigs, "processor", hash);

    // auditor 必須有效
    const signatureOk = auditor.ok === true;

    const multiSigStatus =
      auditor.ok !== true
        ? "fail"
        : recycler.present === false || processor.present === false
        ? "partial"
        : recycler.ok === true && processor.ok === true
        ? "complete"
        : "partial";

    const signatureResults = buildSignatureResults(sigs, hash);

    // ✅ OTS（附下載 link）
    const ots = await getOtsForVersion(version);

    // 你已經做了 /api/ots/download：用 batchId + batchVersionHash 生成下載網址
    const otsReceiptUrl = `/api/ots/download?batchId=${encodeURIComponent(
      String(batchId)
    )}&batchVersionHash=${encodeURIComponent(String(hash))}`;

    // 把 receiptUrl / downloadUrl 填進 ots（讓 UI 直接用 data.ots.receiptUrl）
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
        batchVersionId: String(version.batchVersionId || ""),
        batchVersionHash: String(version.hash || ""),
      },
      report: {
        stored_report_payload_hash: expectedReportPayloadHash || null,
        recomputed_report_payload_hash: recomputedReportPayloadHash,
        audit_time_iso: report.audit_time_iso ?? null,
        time_source: report.time_source ?? null,
      },
      batchVersion: {
        batchVersionId: version.batchVersionId ?? null,
        hash: version.hash,
        prevHash: version.prevHash ?? null,
        payloadHash: version.payloadHash ?? null,
        ts: version.ts ?? null,
        signatures: sigs,
        events: Array.isArray(version?.events) ? version.events : [],
        ots: version.ots ?? null,
        onChain: version.onChain ?? null,
        event: version.event ?? null,
      },
      ots: otsWithLinks,
      checks: {
        signatureOk,
        signatureResults, // ✅ UI 直接吃這個

        reportPayloadHashMatches,
        batchVersionHashMatches,

        otsFilePresent: ots?.status !== "missing",
        otsStatus: ots?.status || "unknown",
        otsReceiptUrl, // ✅ UI 也會吃這個

        // ✅ 保留你原本的 multiSig 判斷（你要黃燈/綠燈用）
        multiSigStatus,
        auditorSigPresent: auditor.present,
        auditorSigOk: auditor.ok,
        recyclerSigPresent: recycler.present,
        recyclerSigOk: recycler.ok,
        processorSigPresent: processor.present,
        processorSigOk: processor.ok,
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