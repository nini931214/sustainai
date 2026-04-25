import fs from "node:fs/promises";
import path from "node:path";

const REPORTS_FILE = path.join(process.cwd(), "app", "data", "reports.json");

export type StoredReport = {
  id: string;
  batchId: string;
  batchVersionId: string;
  report_payload: any;
  report_payload_hash: string;
};

export async function storeReport(report: StoredReport) {
  const txt = await fs.readFile(REPORTS_FILE, "utf8");
  const store = JSON.parse(txt);

  const reports: any[] = store.reports || [];
  const idx = reports.findIndex((r) => r.id === report.id);

  if (idx >= 0) {
    reports[idx] = report; // 同 id 覆蓋
  } else {
    reports.push(report);
  }

  store.reports = reports;
  await fs.writeFile(REPORTS_FILE, JSON.stringify(store, null, 2), "utf8");
}