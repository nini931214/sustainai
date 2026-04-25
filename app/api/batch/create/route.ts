// app/api/batch/create/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

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

async function writeJsonPretty(filePath: string, data: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * 版本雜湊：prevHash + payloadHash + ts + eventType
 */
function computeVersionHash(prevHash: string, payloadHash: string, tsIso: string, eventType: string) {
  return sha256Hex(`${prevHash}|${payloadHash}|${tsIso}|${eventType}`);
}

function ensureId(prefix = "BATCH") {
  // demo 友善：BATCH-YYYY-XXX 的格式你也能自己傳 id
  const d = new Date();
  const y = d.getFullYear();
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${y}-${rand}`;
}

/* ---------------- API ---------------- */
/**
 * POST /api/batch/create
 * body（可精簡）：{
 *   id?: string,
 *   material?: string,
 *   kg?: number,
 *   recycler?: { id?: string, name?: string },
 *   processor?: {...},
 *   manufacturer?: {...},
 *   transport?: {...},
 *   createdBy?: string,          // actorName
 *   createdByRole?: string       // actorRole (recycler/processor/manufacturer/admin)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nowIso = new Date().toISOString();

    const id = String(body?.id || "").trim() || ensureId("BATCH");
    const material = body?.material ?? "—";
    const kg = typeof body?.kg === "number" ? body.kg : Number(body?.kg ?? 0);

    const createdBy = String(body?.createdBy || "system").trim();
    const createdByRole = String(body?.createdByRole || "recycler").trim();

    // 你可以只傳 id/material/kg，其它留空也OK
    const newBatch: any = {
      id,
      material,
      kg,
      recycler: body?.recycler ?? null,
      processor: body?.processor ?? null,
      manufacturer: body?.manufacturer ?? null,
      transport: body?.transport ?? null,

      // ✅ 建立時先 pending，保留手動核准流程
      audit: {
        status: "pending",
        by: null,
        ts: null,
        note: null,
      },

      created_at: nowIso,
      ts: nowIso,
    };

    /* ---------- write chain.json ---------- */
    const chainRows = await readJsonAny(CHAIN_FILE, []);
    const rows: any[] = Array.isArray(chainRows) ? chainRows : [];

    const existed = rows.find((r) => String(r?.id) === id);
    if (existed) {
      return NextResponse.json(
        { ok: false, error: "BATCH_ALREADY_EXISTS", id },
        { status: 409 }
      );
    }

    rows.push(newBatch);
    await writeJsonPretty(CHAIN_FILE, rows);

    /* ---------- write batch_versions.json (event ledger) ---------- */
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

    // prevHash: 找這個 batchId 的最後一筆（新建通常沒有）
    const last = [...records]
      .filter((r) => String(r?.batchId) === id)
      .sort((a, b) => String(a?.ts || "").localeCompare(String(b?.ts || "")))
      .at(-1);

    const prevHash = String(last?.hash || "");

    const payloadHash = sha256Hex(stableJson(newBatch));
    const eventType = "BATCH_CREATED";
    const hash = computeVersionHash(prevHash, payloadHash, nowIso, eventType);
    const batchVersionId = `${id}@${nowIso}`;

    const record = {
      batchId: id,
      batchVersionId,
      ts: nowIso,

      event: {
        type: eventType,
        actorRole: createdByRole,
        actorId: createdBy,      // demo：先用名字/識別字串
        actorName: createdBy,
        summary: "batch created",
        note: null,
      },

      prevHash: prevHash || null,
      payloadHash,
      hash,

      // ✅ 先不簽章：多角色簽章是你後面要做的（第三/第四步）
      signatures: [],
      signature: null,
      alg: null,
      signer: null,
      signerName: null,

      ots: null,
    };

    records.push(record);
    await writeJsonPretty(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      id,
      created_at: nowIso,
      batchVersionId,
      batchVersionHash: hash,
      wrote: {
        chain: path.relative(process.cwd(), CHAIN_FILE),
        batch_versions: path.relative(process.cwd(), BATCH_VERSIONS_FILE),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "BATCH_CREATE_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}

/**
 * 方便你用瀏覽器直接打：
 * GET /api/batch/create?id=BATCH-2026-ABC&material=PET&kg=20
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  const id = url.searchParams.get("id") || "";
  const material = url.searchParams.get("material") || "PET";
  const kg = Number(url.searchParams.get("kg") || 20);

  const createdBy = url.searchParams.get("createdBy") || "system";
  const createdByRole = url.searchParams.get("createdByRole") || "recycler";

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, material, kg, createdBy, createdByRole }),
    })
  );
}