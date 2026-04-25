// app/api/audit/upgrade-ots/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { otsUpgrade } from "@/lib/ots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, obj: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2), "utf8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = String(body?.batchId || "");
    const batchVersionId = String(body?.batchVersionId || "");

    if (!batchId || !batchVersionId) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", message: "batchId & batchVersionId required" },
        { status: 400 }
      );
    }

    const db = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(db?.records) ? db.records : [];

    const idx = records.findIndex(
      (r) => String(r?.batchId) === batchId && String(r?.batchVersionId) === batchVersionId
    );
    if (idx === -1) {
      return NextResponse.json(
        { ok: false, error: "BATCH_VERSION_NOT_FOUND", batchId, batchVersionId },
        { status: 404 }
      );
    }

    const version = records[idx];
    const otsFileRel = version?.ots?.otsFile;
    if (!otsFileRel) {
      return NextResponse.json(
        { ok: false, error: "OTS_FILE_MISSING", message: "seal-ots first" },
        { status: 400 }
      );
    }

    const otsFileAbs = path.join(process.cwd(), otsFileRel);
    const upgraded = await otsUpgrade(otsFileAbs);

    records[idx] = {
      ...version,
      ots: {
        ...(version.ots || {}),
        status: upgraded.status,
        updatedAtIso: upgraded.updatedAtIso,
        lastStdout: (upgraded.stdout || "").slice(0, 4000),
        lastStderr: (upgraded.stderr || "").slice(0, 4000),
      },
    };

    await writeJson(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId,
      ots: records[idx].ots,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "UPGRADE_OTS_FAILED",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}