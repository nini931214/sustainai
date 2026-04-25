// app/api/ots/download/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");
const OTS_DIR = path.join(DATA_DIR, "ots");

/* ---------------- utils ---------------- */

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function safeVidFromVersion(version: any) {
  const raw =
    String(version?.batchVersionId || "").trim() ||
    `hash:${String(version?.hash || "").slice(0, 16)}`;
  return raw.replace(/[^\w@.\-:]+/g, "_");
}

function resolveOtsPaths(version: any) {
  // ✅ 若 version.ots 有指定路徑，優先用（最準）
  const otsPathRel = version?.ots?.otsPath ? String(version.ots.otsPath) : "";
  const hashPathRel = version?.ots?.hashPath ? String(version.ots.hashPath) : "";

  if (otsPathRel) {
    const otsAbs = path.join(process.cwd(), otsPathRel);
    const hashAbs = hashPathRel ? path.join(process.cwd(), hashPathRel) : null;
    return { otsAbs, hashAbs };
  }

  // ✅ 否則採用預設結構：data/ots/<batchId>/<safeVid>/<safeVid>.hash(.ots)
  const batchId = String(version?.batchId || "");
  const safeVid = safeVidFromVersion(version);
  const dir = path.join(OTS_DIR, batchId, safeVid);

  const hashAbs = path.join(dir, `${safeVid}.hash`);
  const otsAbs = `${hashAbs}.ots`;
  return { otsAbs, hashAbs };
}

/* ---------------- API ---------------- */
/**
 * GET /api/ots/download?batchId=...&batchVersionHash=...&type=ots|hash
 * - type=ots (default): 下載 .ots
 * - type=hash: 下載 .hash
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const batchId = (url.searchParams.get("batchId") || "").trim();
    const batchVersionHash = (url.searchParams.get("batchVersionHash") || "").trim();
    const batchVersionId = (url.searchParams.get("batchVersionId") || "").trim();
    const type = (url.searchParams.get("type") || "ots").trim().toLowerCase();

    if (!batchId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BATCH_ID", required: ["batchId"] },
        { status: 400 }
      );
    }

    if (!batchVersionHash && !batchVersionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_VERSION_KEY",
          required: ["batchVersionHash OR batchVersionId"],
        },
        { status: 400 }
      );
    }

    /* ---------- load versions ---------- */
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(versionsDb?.records) ? versionsDb.records : [];

    // 先用 hash 命中（最準），否則用 batchVersionId
    const version =
      (batchVersionHash
        ? records.find(
            (r) =>
              String(r?.batchId) === batchId &&
              String(r?.hash || "") === batchVersionHash
          )
        : null) ||
      (batchVersionId
        ? records.find(
            (r) =>
              String(r?.batchId) === batchId &&
              String(r?.batchVersionId || "") === batchVersionId
          )
        : null);

    if (!version) {
      return NextResponse.json(
        {
          ok: false,
          error: "BATCH_VERSION_NOT_FOUND",
          batchId,
          batchVersionHash: batchVersionHash || null,
          batchVersionId: batchVersionId || null,
          hint: "Check data/batch_versions.json records[]",
        },
        { status: 404 }
      );
    }

    const { otsAbs, hashAbs } = resolveOtsPaths(version);

    const fileAbs =
      type === "hash" ? hashAbs : otsAbs; // default ots

    if (!fileAbs) {
      return NextResponse.json(
        { ok: false, error: "PATH_RESOLVE_FAILED" },
        { status: 500 }
      );
    }

    /* ---------- ensure exists ---------- */
    try {
      await fs.access(fileAbs);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "OTS_FILE_NOT_FOUND",
          files: {
            requested: type,
            path: path.relative(process.cwd(), fileAbs),
            otsFile: path.relative(process.cwd(), otsAbs),
            hashFile: hashAbs ? path.relative(process.cwd(), hashAbs) : null,
          },
        },
        { status: 404 }
      );
    }

    /* ---------- read + download ---------- */
    const buf = await fs.readFile(fileAbs);

    const safeVid = safeVidFromVersion(version);
    const ext = type === "hash" ? "hash" : "hash.ots";
    const filename = `${batchId}-${safeVid}.${ext}`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "OTS_DOWNLOAD_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}