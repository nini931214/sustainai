// scripts/tamper-test.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REPORTS_PATH = path.join(ROOT, "data", "reports.json");
const BATCH_VERSIONS_PATH = path.join(ROOT, "data", "batch_versions.json");

const REPORT_ID = process.env.REPORT_ID || "RPT-001";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, json: { raw: text } };
  }
}

async function readJson(p) {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

async function writeJson(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf8");
}

function normalizeRecords(x) {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.records)) return x.records;
  return [];
}

async function main() {
  const verifyUrl = `${BASE_URL}/api/verify/report?reportId=${encodeURIComponent(REPORT_ID)}`;

  console.log("1) Verify (before tamper):", verifyUrl);
  const r1 = await fetchJson(verifyUrl);
  console.log(r1.json);

  if (!r1.json?.ok) {
    console.log("❌ 目前 verify 不是 ok（先確保 report hash / batchVersionId / batch_versions 有資料）");
    process.exitCode = 1;
    return;
  }

  const reportsBackup = await fs.readFile(REPORTS_PATH, "utf8");
  const versionsBackup = await fs.readFile(BATCH_VERSIONS_PATH, "utf8").catch(() => "");

  try {
    // A) tamper report payload
    console.log("\n2A) Tamper REPORT: 改 report_payload.summary + 'X' → 應 fail");
    const reportsStore = await readJson(REPORTS_PATH);
    const idx = reportsStore.reports.findIndex((x) => String(x?.id) === REPORT_ID);
    if (idx < 0) throw new Error(`找不到 reportId=${REPORT_ID}`);
    const rep = reportsStore.reports[idx];
    rep.report_payload = rep.report_payload || {};
    rep.report_payload.summary = String(rep.report_payload.summary || "") + "X";
    reportsStore.reports[idx] = rep;
    await writeJson(REPORTS_PATH, reportsStore);

    const r2 = await fetchJson(verifyUrl);
    console.log(r2.json);
    if (r2.json?.ok === true) {
      console.log("❌ 失敗：改 report 後仍 ok（表示 verify 沒驗 report hash）");
      process.exitCode = 1;
      return;
    }
    console.log("✅ OK：改 report 一字就 fail");

    // restore reports before B test
    await fs.writeFile(REPORTS_PATH, reportsBackup, "utf8");

    // B) tamper batch_versions entry (payloadHash 改一字)
    console.log("\n2B) Tamper CHAIN: 改 batch_versions.payloadHash 一字 → 應 signatureValid/chainValid fail");
    const versionsDb = versionsBackup ? JSON.parse(versionsBackup) : { records: [] };
    const records = normalizeRecords(versionsDb);

    const targetVersionId = r1.json?.batchVersionId;
    const eidx = records.findIndex((e) => String(e?.batchVersionId) === String(targetVersionId));
    if (eidx < 0) throw new Error(`找不到 batchVersionId=${targetVersionId}（batch_versions.json 內不存在）`);

    const entry = records[eidx];
    const ph = String(entry.payloadHash || "");
    if (!ph) throw new Error("target entry payloadHash 是空的");

    // 改第一個字元（簡單粗暴）
    entry.payloadHash = (ph[0] === "a" ? "b" : "a") + ph.slice(1);
    records[eidx] = entry;

    // 寫回原格式
    const out = Array.isArray(versionsDb) ? records : { ...versionsDb, records };
    await writeJson(BATCH_VERSIONS_PATH, out);

    const r3 = await fetchJson(verifyUrl);
    console.log(r3.json);

    if (r3.json?.signatureValid === true && r3.json?.chainValid === true) {
      console.log("❌ 失敗：改鏈後仍顯示 valid（代表 verify 沒有驗 chain/signature）");
      process.exitCode = 1;
      return;
    }
    console.log("✅ OK：改鏈一字就 fail（signature/chain 會爆）");

    console.log("\n🎉 防篡改 demo 完整達標（report + chain 都可驗）");
  } finally {
    await fs.writeFile(REPORTS_PATH, reportsBackup, "utf8");
    if (versionsBackup) await fs.writeFile(BATCH_VERSIONS_PATH, versionsBackup, "utf8");
    console.log("\n3) 已還原 reports.json / batch_versions.json");
  }
}

main().catch((e) => {
  console.error("tamper-test failed:", e);
  process.exitCode = 1;
});