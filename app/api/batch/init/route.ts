// app/api/batch/init/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- utils ---------------- */

function nowIso() {
  return new Date().toISOString();
}

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

function signBase64(message: string) {
  const priv = process.env.PRIVATE_KEY_PEM;
  if (!priv) throw new Error("PRIVATE_KEY_MISSING");

  const pem = priv.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);

  return sig.toString("base64");
}

function makeId(prefix: string) {
  const r = crypto.randomBytes(3).toString("hex").toUpperCase();
  const t = Date.now().toString().slice(-6);
  return `${prefix}-${t}-${r}`;
}

/* ---------------- API ---------------- */

/**
 * POST /api/batch/init
 * body:
 * {
 *   batch: {
 *     id?,
 *     material?,
 *     kg?,
 *     recycler?,
 *     processor?,
 *     manufacturer?,
 *     transport?,
 *     audit?
 *   },
 *   reportId?: string,
 *   batchVersionId?: string,
 *   reportPayload?: any
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchIn = body?.batch ?? {};

    const batchId = String(batchIn?.id || body?.batchId || makeId("BATCH"));
    const batchVersionId = String(body?.batchVersionId || makeId("VER"));
    const reportId = String(body?.reportId || makeId("RPT"));

    const { data: latestVersion, error: latestError } = await supabaseAdmin
      .from("batch_versions")
      .select("*")
      .eq("batch_id", batchId)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) throw latestError;

    const prevHash = latestVersion?.hash ? String(latestVersion.hash) : null;

    const batchPayload = {
      id: batchId,
      material: batchIn?.material ?? null,
      kg: batchIn?.kg ?? batchIn?.weight ?? null,
      recycler: batchIn?.recycler ?? null,
      processor: batchIn?.processor ?? null,
      manufacturer: batchIn?.manufacturer ?? null,
      transport: batchIn?.transport ?? null,
      audit: batchIn?.audit ?? null,
    };

    const payloadHash = sha256Hex(stableJson(batchPayload));
    const versionMessage = prevHash ? `${prevHash}:${payloadHash}` : payloadHash;
    const versionHash = sha256Hex(versionMessage);
    const signature = signBase64(versionHash);
    const createdAt = nowIso();

    const reportPayload =
      body?.reportPayload ??
      ({
        reportId,
        batchId,
        batchVersionId,
        batchVersionHash: versionHash,
        createdAt,
        batch: batchPayload,
      } as any);

    const reportPayloadHash = sha256Hex(stableJson(reportPayload));

    const audit =
      batchIn?.audit ??
      ({
        status: "pending",
        ts: createdAt,
        by: "system",
      } as any);

    const batchNode = {
      id: batchId,
      material: batchIn?.material ?? null,
      kg: batchIn?.kg ?? batchIn?.weight ?? null,
      weight: batchIn?.weight ?? batchIn?.kg ?? null,
      recycler: batchIn?.recycler ?? null,
      processor: batchIn?.processor ?? null,
      manufacturer: batchIn?.manufacturer ?? null,
      transport: batchIn?.transport ?? null,
      audit,
      status: audit?.status ?? "pending",
      report_id: reportId,
      batch_version_id: batchVersionId,
      batch_version_hash: versionHash,
      report_payload_hash: reportPayloadHash,
      ts: batchIn?.ts ?? createdAt,
      created_at: batchIn?.created_at ?? createdAt,
      updated_at: createdAt,
    };

    const { error: batchUpsertError } = await supabaseAdmin
      .from("batches")
      .upsert(batchNode, { onConflict: "id" });

    if (batchUpsertError) throw batchUpsertError;

    const { error: versionUpsertError } = await supabaseAdmin
      .from("batch_versions")
      .upsert(
        {
          batch_id: batchId,
          batch_version_id: batchVersionId,
          hash: versionHash,
          prev_hash: prevHash,
          payload_hash: payloadHash,
          payload: batchPayload,
          ts: createdAt,
          signature,
          signer: "SustainAI Demo Signer",
          signer_name: "SustainAI",
          alg: "RSA-SHA256",
          ots: null,
          on_chain: null,
        },
        { onConflict: "batch_version_id" }
      );

    if (versionUpsertError) throw versionUpsertError;

    const { error: reportUpsertError } = await supabaseAdmin
      .from("reports")
      .upsert(
        {
          id: reportId,
          report_id: reportId,
          batch_id: batchId,
          batch_version_id: batchVersionId,
          batch_version_hash: versionHash,
          report_payload: reportPayload,
          report_payload_hash: reportPayloadHash,
          audit_time_iso: createdAt,
          time_source: "api/batch/init",
          status: "pending",
        },
        { onConflict: "id" }
      );

    if (reportUpsertError) throw reportUpsertError;

    const { error: logError } = await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: "batch_init",
      actor_role: "system",
      payload: {
        batchId,
        batchVersionId,
        batchVersionHash: versionHash,
        reportId,
        reportPayloadHash,
      },
    });

    if (logError) {
      console.warn("audit_logs insert failed:", logError.message);
    }

    return NextResponse.json({
      ok: true,
      created: {
        batchId,
        batchVersionId,
        batchVersionHash: versionHash,
        reportId,
        reportPayloadHash,
      },
      verifyUrl: `/verify?reportId=${encodeURIComponent(reportId)}&batchId=${encodeURIComponent(
        batchId
      )}&batchVersionHash=${encodeURIComponent(versionHash)}&batchVersionId=${encodeURIComponent(
        batchVersionId
      )}&reportPayloadHash=${encodeURIComponent(reportPayloadHash)}`,
      traceUrl: `/trace/${encodeURIComponent(batchId)}`,
      wrote: "supabase:batches,batch_versions,reports,audit_logs",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "BATCH_INIT_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch/init?batchId=...
 * quick check
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const batchId = String(url.searchParams.get("batchId") || "").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", required: ["batchId"] },
        { status: 400 }
      );
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) throw batchError;

    const { data: latestVersion, error: versionError } = await supabaseAdmin
      .from("batch_versions")
      .select("*")
      .eq("batch_id", batchId)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) throw versionError;

    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportError) throw reportError;

    return NextResponse.json({
      ok: true,
      batchId,
      chain: batch,
      latestVersion,
      anyReport: report,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "BATCH_INIT_CHECK_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}