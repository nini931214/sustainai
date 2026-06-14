// app/api/manufacturer/upload/route.ts
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
  delete cloned.on_chain;
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

function signBase64(message: string) {
  const pemRaw =
    process.env.MANUFACTURER_PRIVATE_KEY_PEM ||
    process.env.PRIVATE_KEY_PEM ||
    "";

  if (!pemRaw) throw new Error("PRIVATE_KEY_MISSING");

  const pem = pemRaw.replace(/\\n/g, "\n");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);

  return sig.toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const batchId = String(body?.batchId || body?.id || "").trim();
    const manufacturer = body?.manufacturer || null;

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID" },
        { status: 400 }
      );
    }

    if (!manufacturer || typeof manufacturer !== "object") {
      return NextResponse.json(
        { ok: false, error: "MISSING_MANUFACTURER_PAYLOAD" },
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
        { ok: false, error: "BATCH_NOT_FOUND", batchId },
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

    base.id = batchId;
    base.batchId = batchId;

    base.manufacturer = {
      ...(base.manufacturer || {}),
      ...manufacturer,
      ts: nowIso,
    };

    const payloadHash = sha256Hex(stableJson(base));
    const prevHash = String(previousVersion?.hash || "");
    const hash = computeVersionHash(prevHash, payloadHash, nowIso);
    const batchVersionId = `${batchId}@${nowIso}`;

    const signerName = String(manufacturer?.name || "Manufacturer");
    const signature = signBase64(hash);

    const event = {
      type: "manufacturer.upload",
      action: "manufacturer_updated",
      ts: nowIso,
      role: "manufacturer",
      by: signerName,
      note: body?.note || null,
      data: { manufacturer },
    };

    const prevEvents = Array.isArray(previousVersion?.events)
      ? previousVersion.events
      : [];

    const signatures = [
      {
        role: "manufacturer",
        signer: String(process.env.MANUFACTURER_DID || "did:web:manufacturer.local"),
        signerName,
        alg: "RSA-SHA256",
        kid: String(process.env.MANUFACTURER_KID || "manufacturer-key-1"),
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
        signer: "manufacturer",
        signer_name: signerName,
        alg: "RSA-SHA256",
        kid: String(process.env.MANUFACTURER_KID || "manufacturer-key-1"),
        events: [...prevEvents, event],
        event,
        ots: null,
        on_chain: null,
      });

    if (insertVersionError) throw insertVersionError;

    const { error: updateBatchError } = await supabaseAdmin
      .from("batches")
      .update({
        manufacturer: base.manufacturer,
        batch_version_id: batchVersionId,
        batch_version_hash: hash,
        report_payload_hash: payloadHash,
        updated_at: nowIso,
      })
      .eq("id", batchId);

    if (updateBatchError) throw updateBatchError;

    const { error: logError } = await supabaseAdmin.from("audit_logs").insert({
      batch_id: batchId,
      action: "manufacturer_updated",
      actor_role: "manufacturer",
      payload: {
        batchId,
        manufacturer: base.manufacturer,
        batchVersionId,
        batchVersionHash: hash,
        event,
      },
    });

    if (logError) {
      console.warn("audit_logs insert failed:", logError.message);
    }

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId,
      batchVersionHash: hash,
      manufacturer: base.manufacturer,
      wrote: "supabase:batches,batch_versions,audit_logs",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "MANUFACTURER_UPLOAD_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}