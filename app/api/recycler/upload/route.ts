// app/api/recycler/upload/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

function computeVersionHash(prevHash: string, payloadHash: string, tsIso: string) {
  return sha256Hex(`${prevHash}|${payloadHash}|${tsIso}`);
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

function signBase64(message: string) {
  const pemRaw =
    process.env.RECYCLER_PRIVATE_KEY_PEM ||
    process.env.PRIVATE_KEY_PEM ||
    "";

  if (!pemRaw) throw new Error("PRIVATE_KEY_MISSING");

  const pem = pemRaw.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);

  return sig.toString("base64");
}

async function triggerAutoPipeline(batchId: string) {
  try {
    const origin = process.env.APP_BASE_URL || "http://localhost:3000";

    const resp = await fetch(`${origin}/api/pipeline/auto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId }),
    });

    const json = await resp.json().catch(() => null);

    return {
      ok: resp.ok && json?.ok !== false,
      status: resp.status,
      result: json,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: "AUTO_PIPELINE_FAILED",
      message: String(err?.message || err),
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || body?.id || "").trim();

    const recycler =
      body?.recycler && typeof body.recycler === "object"
        ? body.recycler
        : {
            id: String(body?.recyclerId || "R1"),
            name: String(body?.recyclerName || "GreenCycle Station"),
          };

    const material = String(body?.material || "PET").trim();
    const kg = Number(body?.kg ?? 20);

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: batchRow, error: batchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) throw batchError;

    if (!batchRow) {
      const { error: insertBatchError } = await supabaseAdmin
        .from("batches")
        .insert({
          id: batchId,
          batch_id: batchId,
          material,
          kg,
          weight: kg,
          recycler: {
            ...recycler,
            ts: nowIso,
          },
          audit: {
            status: "pending",
          },
          status: "pending",
          ts: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (insertBatchError) throw insertBatchError;
    }

    const { data: latestBatchRow, error: latestBatchError } = await supabaseAdmin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();

    if (latestBatchError) throw latestBatchError;

    const { data: previousVersion, error: versionError } = await supabaseAdmin
      .from("batch_versions")
      .select("*")
      .eq("batch_id", batchId)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) throw versionError;

    const base = previousVersion?.payload
      ? JSON.parse(JSON.stringify(previousVersion.payload))
      : JSON.parse(JSON.stringify(toCamelBatch(latestBatchRow)));

    base.id = batchId;
    base.batchId = batchId;
    base.material = base.material || material;
    base.kg = base.kg ?? kg;

    base.recycler = {
      ...(base.recycler || {}),
      ...recycler,
      ts: nowIso,
    };

    const payloadHash = sha256Hex(stableJson(base));
    const prevHash = String(previousVersion?.hash || "");
    const hash = computeVersionHash(prevHash, payloadHash, nowIso);
    const batchVersionId = `${batchId}@${nowIso}`;
    const signerName = String(recycler?.name || "Recycler");
    const signature = signBase64(hash);

    const event = {
      type: "recycler.upload",
      action: "recycler_updated",
      ts: nowIso,
      role: "recycler",
      by: signerName,
      note: body?.note || null,
      data: {
        recycler,
      },
    };

    const prevEvents = Array.isArray(previousVersion?.events)
      ? previousVersion.events
      : [];

    const signatures = [
      {
        role: "recycler",
        signer: String(process.env.RECYCLER_DID || "did:web:recycler.local"),
        signerName,
        alg: "RSA-SHA256",
        kid: String(process.env.RECYCLER_KID || "recycler-key-1"),
        ts: nowIso,
        signature,
      },
    ];

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
        signer: "recycler",
        signer_name: signerName,
        alg: "RSA-SHA256",
        kid: String(process.env.RECYCLER_KID || "recycler-key-1"),
        events: [...prevEvents, event],
        event,
        ots: null,
        on_chain: null,
      });

    if (insertVersionError) throw insertVersionError;

    const { error: updateBatchError } = await supabaseAdmin
      .from("batches")
      .update({
        material: base.material,
        kg: base.kg,
        weight: base.kg,
        recycler: base.recycler,
        batch_version_id: batchVersionId,
        batch_version_hash: hash,
        report_payload_hash: payloadHash,
        updated_at: nowIso,
      })
      .eq("id", batchId);

    if (updateBatchError) throw updateBatchError;

    const { error: logError } = await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: "recycler_updated",
      actor_role: "recycler",
      payload: {
        batchId,
        recycler: base.recycler,
        batchVersionId,
        batchVersionHash: hash,
        event,
      },
    });

    if (logError) {
      console.warn("audit_logs insert failed:", logError.message);
    }

    const autoPipeline = await triggerAutoPipeline(batchId);

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId,
      batchVersionHash: hash,
      recycler: base.recycler,
      autoPipeline,
      wrote: "supabase:batches,batch_versions,audit_logs",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "RECYCLER_UPLOAD_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}