// app/api/audit/seal-ots/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { writeHashFile, otsStamp, otsUpgrade } from "@/lib/ots";

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
    const hashHex = String(version?.hash || "").trim();
    if (!hashHex) {
      return NextResponse.json(
        { ok: false, error: "HASH_MISSING", message: "batchVersion.hash is empty" },
        { status: 400 }
      );
    }

    // ✅ OTS 檔案放這裡：data/ots/<batchId>/<safe(batchVersionId)>/
    const safeVid = batchVersionId.replace(/[^\w@.\-:]+/g, "_");
    const otsDir = path.join(DATA_DIR, "ots", batchId, safeVid);

    const baseName = `batchVersion-${safeVid}`;
    const hashFile = await writeHashFile(otsDir, baseName, hashHex);

    // 1) stamp
    const stamped = await otsStamp(hashFile);

    // 2) 立刻 upgrade 一次（通常會 pending）
    const upgraded = await otsUpgrade(stamped.otsFile);

    // 回寫狀態到 batch_versions.json
    records[idx] = {
      ...version,
      ots: {
  status: upgraded.status,
  otsFile: path.relative(process.cwd(), upgraded.otsFile),
  lastStdout: "",
  lastStderr: "",
},
    };

    await writeJson(BATCH_VERSIONS_FILE, { records });

    return NextResponse.json({
      ok: true,
      batchId,
      batchVersionId,
      ots: records[idx].ots,
      note:
        upgraded.status === "complete"
          ? "OTS complete ✅"
          : "OTS stamped ✅ (upgrade pending; call /api/audit/upgrade-ots later)",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "SEAL_OTS_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}