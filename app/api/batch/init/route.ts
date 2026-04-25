// app/api/batch/init/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

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

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

// 用 tmp + rename 做原子寫入，避免 demo 時檔案被寫壞
async function writeJsonAtomic(filePath: string, data: any) {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function signBase64(message: string) {
  const priv = process.env.PRIVATE_KEY_PEM;
  if (!priv) throw new Error("PRIVATE_KEY_MISSING");
  const pem = priv.replace(/\\n/g, "\n");

  const sig = crypto.sign("RSA-SHA256", Buffer.from(message, "utf8"), pem);
  return sig.toString("base64");
}

function makeId(prefix: string) {
  // demo 用：時間 + 亂數（夠用了）
  const r = crypto.randomBytes(3).toString("hex").toUpperCase();
  const t = Date.now().toString().slice(-6);
  return `${prefix}-${t}-${r}`;
}

function pickLatestVersion(records: any[], batchId: string) {
  const rows = records.filter((r) => String(r?.batchId) === String(batchId));
  if (!rows.length) return null;
  // 以 ts 排序，取最新
  rows.sort((a, b) => String(a?.ts || "").localeCompare(String(b?.ts || "")));
  return rows[rows.length - 1];
}

/* ---------------- API ---------------- */

/**
 * POST /api/batch/init
 * body:
 * {
 *   batch: { id?, material?, kg?, recycler?, processor?, manufacturer?, transport?, audit? ... },
 *   reportId?: string,
 *   batchVersionId?: string,
 *   reportPayload?: any
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchIn = body?.batch ?? {};

    // 1) batchId / ids
    const batchId = String(batchIn?.id || body?.batchId || makeId("BATCH"));
    const batchVersionId = String(body?.batchVersionId || makeId("VER"));
    const reportId = String(body?.reportId || makeId("RPT"));

    // 2) 讀資料庫
    const chainArr: any[] = await readJsonAny(CHAIN_FILE, []);
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });

    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];
    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];

    // 3) 版本鏈：prevHash
    const latest = pickLatestVersion(records, batchId);
    const prevHash = latest?.hash ? String(latest.hash) : null;

    // 4) payload / hash / signature
    //    batchVersion 的 payloadHash 用「batch 節點」的穩定 JSON
    const batchPayload = {
      id: batchId,
      material: batchIn?.material ?? null,
      kg: batchIn?.kg ?? null,
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

    const versionRecord = {
      batchId,
      batchVersionId,
      hash: versionHash, // ✅ verify lookup key
      prevHash,
      payloadHash,
      ts: nowIso(),
      signature, // ✅ verifyBase64(version.hash, signature)
      signer: "SustainAI Demo Signer",
      signerName: "SustainAI",
      alg: "RSA-SHA256",
      ots: null, // 之後 auditor/update 再補
    };

    // 5) report payload / hash
    //    你也可以把 reportPayload 換成更貼近你的報告內容；這裡先做「最小可驗」
    const reportPayload =
      body?.reportPayload ??
      ({
        reportId,
        batchId,
        batchVersionId,
        batchVersionHash: versionHash,
        createdAt: nowIso(),
        // 你可以放你 AI summary 的原始 payload（越完整越好）
        batch: batchPayload,
      } as any);

    const reportPayloadHash = sha256Hex(stableJson(reportPayload));

    const reportRecord = {
      id: reportId,
      reportId,
      batchId,
      batchVersionId,
      batchVersionHash: versionHash,
      report_payload: reportPayload,
      report_payload_hash: reportPayloadHash,
      audit_time_iso: nowIso(),
      time_source: "api/batch/init",
      status: "pending", // ✅ 先 pending；auditor/update 轉 approved
    };

    // 6) 寫入 chain.json：存在就覆蓋，不存在就新增
    const batchNode = {
      ...batchIn,
      id: batchId,
      // ✅ 這兩個關鍵欄位：Trace 產 verifyHref 會用到
      reportId,
      batchVersionId,
      batchVersionHash: versionHash,
      reportPayloadHash,
      audit: batchIn?.audit ?? { status: "pending", ts: nowIso(), by: "system" },
      ts: batchIn?.ts ?? nowIso(),
    };

    const nextChain = Array.isArray(chainArr) ? [...chainArr] : [];
    const idx = nextChain.findIndex((r) => String(r?.id) === batchId);
    if (idx >= 0) nextChain[idx] = { ...nextChain[idx], ...batchNode };
    else nextChain.push(batchNode);

    // 7) 寫入 versions / reports（避免重複：同 batchId + batchVersionId / reportId 就覆蓋）
    const nextRecords = [...records];
    const vIdx = nextRecords.findIndex(
      (r) => String(r?.batchId) === batchId && String(r?.batchVersionId) === batchVersionId
    );
    if (vIdx >= 0) nextRecords[vIdx] = { ...nextRecords[vIdx], ...versionRecord };
    else nextRecords.push(versionRecord);

    const nextReports = [...reports];
    const rIdx = nextReports.findIndex((r) => String(r?.id || r?.reportId) === reportId);
    if (rIdx >= 0) nextReports[rIdx] = { ...nextReports[rIdx], ...reportRecord };
    else nextReports.push(reportRecord);

    // 8) 落盤
    await writeJsonAtomic(CHAIN_FILE, nextChain);
    await writeJsonAtomic(BATCH_VERSIONS_FILE, { records: nextRecords });
    await writeJsonAtomic(REPORTS_FILE, { reports: nextReports });

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
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "BATCH_INIT_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch/init?batchId=...
 * quick check（可選）
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

    const chainArr: any[] = await readJsonAny(CHAIN_FILE, []);
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });

    const node = (chainArr || []).find((r) => String(r?.id) === batchId) || null;
    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];
    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];

    const latest = pickLatestVersion(records, batchId);
    const report = reports.find((r) => String(r?.batchId) === batchId) || null;

    return NextResponse.json({
      ok: true,
      batchId,
      chain: node,
      latestVersion: latest,
      anyReport: report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "BATCH_INIT_CHECK_FAILED", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}