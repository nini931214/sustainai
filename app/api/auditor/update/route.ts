// app/api/auditor/update/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeStatus(input: any): "approved" | "rejected" | "pending" {
  const s = String(input || "").trim().toLowerCase();

  if (s === "通過" || s === "approved") return "approved";
  if (s === "退回" || s === "rejected") return "rejected";
  if (s === "待審" || s === "pending") return "pending";

  return "pending";
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

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function computeVersionHash(prevHash: string, payloadHash: string, tsIso: string) {
  return sha256Hex(`${prevHash}|${payloadHash}|${tsIso}`);
}

function signBase64(message: string) {
  const pemRaw =
    process.env.AUDITOR_PRIVATE_KEY_PEM ||
    process.env.PRIVATE_KEY_PEM ||
    "";

  if (!pemRaw) throw new Error("PRIVATE_KEY_MISSING");

  const pem = pemRaw.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);

  return sig.toString("base64");
}

function buildAuditEvent(params: {
  ts: string;
  by: string;
  status: "approved" | "rejected" | "pending";
  note: string;
  prevStatus: string | null;
}) {
  return {
    type: "admin.audit",
    action: "audit_status_changed",
    ts: params.ts,
    role: "auditor",
    by: params.by,
    note: params.note || null,
    data: {
      prevStatus: params.prevStatus,
      nextStatus: params.status,
    },
  };
}

function stripVersionMeta(versionLike: any) {
  const cloned = JSON.parse(JSON.stringify(versionLike || {}));

  delete cloned.hash;
  delete cloned.prevHash;
  delete cloned.payloadHash;
  delete cloned.batchVersionId;
  delete cloned.ts;
  delete cloned.signatures;
  delete cloned.signature;
  delete cloned.signer;
  delete cloned.signerName;
  delete cloned.alg;
  delete cloned.kid;
  delete cloned.ots;
  delete cloned.onChain;
  delete cloned.event;
  delete cloned.events;

  return cloned;
}

function toCamelBatch(row: any) {
  return {
    ...row,
    batchId: row?.batch_id ?? row?.batchId ?? row?.id,
    reportId: row?.report_id ?? row?.reportId,
    batchVersionId: row?.batch_version_id ?? row?.batchVersionId,
    batchVersionHash: row?.batch_version_hash ?? row?.batchVersionHash,
    reportPayloadHash: row?.report_payload_hash ?? row?.reportPayloadHash,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || body?.id || "").trim();
    const status = normalizeStatus(body?.status);
    const note = String(body?.note || "").trim();
    const auditorName = String(body?.auditorName || body?.by || "ESG Auditor").trim();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    const { data: batchRow, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) throw batchError;

    if (!batchRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_NOT_FOUND",
          batchId,
        },
        { status: 404 }
      );
    }

    const { data: previousVersion, error: versionError } = await supabaseAdmin
      .from("batch_versions")
      .select("*")
      .eq("batch_id", batchId)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) throw versionError;

    const nowIso = new Date().toISOString();

    const base = previousVersion?.payload
      ? JSON.parse(JSON.stringify(previousVersion.payload))
      : JSON.parse(JSON.stringify(toCamelBatch(batchRow)));

    const prevStatus = String(base?.audit?.status || batchRow?.audit?.status || "") || null;

    base.id = batchId;
    base.batchId = batchId;
    base.audit = {
      ...(base.audit || {}),
      status,
      by: auditorName,
      note: note || null,
      ts: nowIso,
    };

    const payloadHash = sha256Hex(stableJson(base));
    const prevHash = String(previousVersion?.hash || "");
    const hash = computeVersionHash(prevHash, payloadHash, nowIso);
    const batchVersionId = `${batchId}@${nowIso}`;

    const signature = signBase64(hash);

    const event = buildAuditEvent({
      ts: nowIso,
      by: auditorName,
      status,
      note,
      prevStatus,
    });

    const prevEvents = Array.isArray(previousVersion?.events)
      ? previousVersion.events
      : [];

    const signatures = [
      {
        role: "auditor",
        signer: String(process.env.AUDITOR_DID || "did:web:auditor.local"),
        signerName: auditorName,
        alg: "RSA-SHA256",
        kid: String(process.env.AUDITOR_KID || "auditor-key-1"),
        ts: nowIso,
        signature,
      },
    ];

    const newVersionPayload = {
      ...base,
      batchId,
      batchVersionId,
      ts: nowIso,
      prevHash: prevHash || null,
      payloadHash,
      hash,
      signatures,
      signature,
      signer: "auditor",
      signerName: auditorName,
      alg: "RSA-SHA256",
      events: [...prevEvents, event],
      event,
      ots: null,
      onChain: null,
    };

    const { error: insertVersionError } = await supabaseAdmin
      .from("batch_versions")
      .insert({
        batch_id: batchId,
        batch_version_id: batchVersionId,
        ts: nowIso,
        prev_hash: prevHash || null,
        payload_hash: payloadHash,
        hash,
        payload: base,
        signatures,
        signature,
        signer: "auditor",
        signer_name: auditorName,
        alg: "RSA-SHA256",
        kid: String(process.env.AUDITOR_KID || "auditor-key-1"),
        events: [...prevEvents, event],
        event,
        ots: null,
        on_chain: null,
      });

    if (insertVersionError) throw insertVersionError;

    const { error: updateBatchError } = await supabaseAdmin
      .from("batches")
      .update({
        audit: base.audit,
        status,
        batch_version_id: batchVersionId,
        batch_version_hash: hash,
        report_payload_hash: payloadHash,
        updated_at: nowIso,
      })
      .eq("id", batchId);

    if (updateBatchError) throw updateBatchError;

    const { error: logError } = await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: "audit_status_changed",
      actor_role: "auditor",
      payload: {
        batchId,
        status,
        auditorName,
        note,
        prevStatus,
        batchVersionId,
        batchVersionHash: hash,
        event,
      },
    });

    if (logError) {
      console.warn("audit_logs insert failed:", logError.message);
    }

    let anchored = false;
    let anchorResult: any = null;

    if (status === "approved") {
      try {
        const origin = process.env.APP_BASE_URL || "http://localhost:3000";

        const resp = await fetch(`${origin}/api/onchain/anchor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            batchVersionHash: hash,
          }),
        });

        anchorResult = await resp.json().catch(() => null);

        if (resp.ok && anchorResult?.ok) {
          anchored = true;
        } else {
          anchorResult = {
            ok: false,
            note: "anchor skipped / failed",
            raw: anchorResult,
          };
        }
      } catch (err: any) {
        anchorResult = {
          ok: false,
          error: "ANCHOR_CALL_FAILED",
          message: String(err?.message || err),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      batchId,
      status,
      auditorName,
      batchVersionId,
      batchVersionHash: hash,
      payloadHash,
      anchored,
      anchorResult,
      version: newVersionPayload,
      wrote: "supabase:batches,batch_versions,audit_logs",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AUDITOR_UPDATE_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const batchId = url.searchParams.get("batchId") || url.searchParams.get("id") || "";
  const status = url.searchParams.get("status") || "approved";
  const note = url.searchParams.get("note") || "";
  const auditorName =
    url.searchParams.get("auditorName") ||
    url.searchParams.get("by") ||
    "ESG Auditor";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId,
        status,
        note,
        auditorName,
      }),
    })
  );
}