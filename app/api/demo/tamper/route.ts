// app/api/demo/tamper/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const BACKUP_FILE = path.join(DATA_DIR, "_tamper_backup.json");

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

function findReportIndex(reports: any[], reportId: string) {
  const rid = String(reportId || "");
  return reports.findIndex(
    (r) => String(r?.id || r?.reportId || r?.report_id || "") === rid
  );
}

function getReportPayload(report: any) {
  return (
    report?.report_payload ??
    report?.reportPayload ??
    report?.payload ??
    report?.reportPayloadJson ??
    null
  );
}

function setReportPayload(report: any, payload: any) {
  // 盡量維持你原本習慣用 report_payload
  report.report_payload = payload;
  // 同步一些常見欄位（避免你專案其他地方讀不同 key）
  report.reportPayload = payload;
  report.payload = payload;
  report.reportPayloadJson = payload;
}

export async function GET(req: Request) {
  try {
    // ✅ 安全：只允許 dev（避免 production 被亂按）
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "Tamper demo is disabled in production." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const action = (url.searchParams.get("action") || "").trim(); // tamper | restore
    const reportId = (url.searchParams.get("reportId") || "").trim();

    if (!action || !reportId) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_PARAMS",
          required: ["action", "reportId"],
          hint: "Use /api/demo/tamper?action=tamper|restore&reportId=RPT-...",
        },
        { status: 400 }
      );
    }

    // 讀 reports.json
    const reportsDb = await readJsonAny(REPORTS_FILE, { reports: [] });
    const reports: any[] = Array.isArray(reportsDb?.reports) ? reportsDb.reports : [];

    const idx = findReportIndex(reports, reportId);
    if (idx < 0) {
      return NextResponse.json(
        { ok: false, error: "REPORT_NOT_FOUND", reportId, hint: "Check data/reports.json" },
        { status: 404 }
      );
    }

    // 讀/建 backup
    const backupDb = await readJsonAny(BACKUP_FILE, { backups: {} as Record<string, any> });
    const backups: Record<string, any> = backupDb?.backups && typeof backupDb.backups === "object"
      ? backupDb.backups
      : {};

    const report = reports[idx];
    const currentPayload = getReportPayload(report);

    if (action === "tamper") {
      // ✅ 第一次 tamper 才備份（避免連按覆蓋備份）
      if (!backups[reportId]) {
        backups[reportId] = {
          savedAt: new Date().toISOString(),
          payload: currentPayload,
        };
      }

      // ✅ 做「最小改動但一定改到 hash」：塞一個 demo 欄位（每次不同）
      const nextPayload =
        currentPayload && typeof currentPayload === "object" && !Array.isArray(currentPayload)
          ? {
              ...currentPayload,
              __tamper_demo__: {
                note: "demo tamper",
                nonce: Math.random().toString(16).slice(2),
                at: new Date().toISOString(),
              },
            }
          : {
              __tamper_demo__: {
                note: "demo tamper",
                nonce: Math.random().toString(16).slice(2),
                at: new Date().toISOString(),
              },
              original: currentPayload,
            };

      setReportPayload(report, nextPayload);

      await writeJsonPretty(REPORTS_FILE, { ...reportsDb, reports });
      await writeJsonPretty(BACKUP_FILE, { backups });

      return NextResponse.json({
        ok: true,
        action: "tamper",
        reportId,
        message: "reports.json updated (tampered). Backup saved.",
        backupFile: path.relative(process.cwd(), BACKUP_FILE),
        reportsFile: path.relative(process.cwd(), REPORTS_FILE),
      });
    }

    if (action === "restore") {
      const b = backups[reportId];
      if (!b) {
        return NextResponse.json({
          ok: false,
          error: "NO_BACKUP",
          reportId,
          message: "No backup found. Tamper first, then restore.",
        }, { status: 409 });
      }

      setReportPayload(report, b.payload);

      // restore 後把備份清掉（你也可以保留，看你要不要）
      delete backups[reportId];

      await writeJsonPretty(REPORTS_FILE, { ...reportsDb, reports });
      await writeJsonPretty(BACKUP_FILE, { backups });

      return NextResponse.json({
        ok: true,
        action: "restore",
        reportId,
        message: "reports.json restored from backup.",
        backupFile: path.relative(process.cwd(), BACKUP_FILE),
        reportsFile: path.relative(process.cwd(), REPORTS_FILE),
      });
    }

    return NextResponse.json(
      { ok: false, error: "BAD_ACTION", action, allowed: ["tamper", "restore"] },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "TAMPER_FAILED",
        message: String(err?.message || err),
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
}