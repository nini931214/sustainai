// ===== OTS AUTO-SEAL（封存後立即）=====
import path from "path";
import fs from "fs/promises";
import { sealOtsFromHashHex } from "@/lib/ots";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

// ⬇️ 請把這段放在：你第一次 writeFile batch_versions.json 成功後的下一行
{
  // 1) 取得你剛封存的那筆 batchVersion（假設叫 newVersion）
  const batchId = String(newVersion?.batchId || "");
  const batchVersionId = String(newVersion?.batchVersionId || "");
  const hashHex = String(newVersion?.hash || "").trim();

  // 沒資料就不做（不擋封存）
  if (!batchId || !batchVersionId || !hashHex) {
    // 可選：console.log("[OTS] skip (missing batchId/batchVersionId/hash)");
  } else {
    const safeVid = batchVersionId.replace(/[^\w@.\-:]+/g, "_");
    const outDir = path.join(DATA_DIR, "ots", batchId, safeVid);
    const fileStem = safeVid;

    // 確保資料夾存在
    await fs.mkdir(outDir, { recursive: true });

    const otsResult = await sealOtsFromHashHex({
      hashHex,
      outDir,
      fileStem,
      tryUpgrade: true, // upgrade 不成功也不擋封存
    });

    // 2) 寫回 ots 欄位（讓 verify 找得到檔）
    newVersion.ots = {
      hashPath: path.relative(process.cwd(), path.join(outDir, `${fileStem}.hash`)),
      otsPath: path.relative(process.cwd(), path.join(outDir, `${fileStem}.hash.ots`)),
      stampOk: otsResult.stamp.ok,
      upgradeOk: otsResult.upgrade?.ok ?? false,
      upgradedAt: otsResult.upgrade?.ok ? new Date().toISOString() : null,
    };

    // 3) 再讀一次 batch_versions.json，把這筆更新回去，再寫一次
    const raw2 = await fs.readFile(BATCH_VERSIONS_FILE, "utf8").catch(() => "");
    const db2 = JSON.parse(raw2 || "null") ?? { records: [] };
    const records2: any[] = Array.isArray(db2.records) ? db2.records : [];

    const idx2 = records2.findIndex(
      (r) =>
        String(r?.batchId) === batchId &&
        String(r?.batchVersionId) === batchVersionId
    );

    if (idx2 >= 0) records2[idx2] = newVersion;
    else records2.push(newVersion);

    await fs.writeFile(
      BATCH_VERSIONS_FILE,
      JSON.stringify({ records: records2 }, null, 2),
      "utf8"
    );
  }
}// ===== OTS AUTO-SEAL（封存後立即）=====
import path from "path";
import fs from "fs/promises";
import { sealOtsFromHashHex } from "@/lib/ots";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

// ⬇️ 請把這段放在：你第一次 writeFile batch_versions.json 成功後的下一行
{
  // 1) 取得你剛封存的那筆 batchVersion（假設叫 newVersion）
  const batchId = String(newVersion?.batchId || "");
  const batchVersionId = String(newVersion?.batchVersionId || "");
  const hashHex = String(newVersion?.hash || "").trim();

  // 沒資料就不做（不擋封存）
  if (!batchId || !batchVersionId || !hashHex) {
    // 可選：console.log("[OTS] skip (missing batchId/batchVersionId/hash)");
  } else {
    const safeVid = batchVersionId.replace(/[^\w@.\-:]+/g, "_");
    const outDir = path.join(DATA_DIR, "ots", batchId, safeVid);
    const fileStem = safeVid;

    // 確保資料夾存在
    await fs.mkdir(outDir, { recursive: true });

    const otsResult = await sealOtsFromHashHex({
      hashHex,
      outDir,
      fileStem,
      tryUpgrade: true, // upgrade 不成功也不擋封存
    });

    // 2) 寫回 ots 欄位（讓 verify 找得到檔）
    newVersion.ots = {
      hashPath: path.relative(process.cwd(), path.join(outDir, `${fileStem}.hash`)),
      otsPath: path.relative(process.cwd(), path.join(outDir, `${fileStem}.hash.ots`)),
      stampOk: otsResult.stamp.ok,
      upgradeOk: otsResult.upgrade?.ok ?? false,
      upgradedAt: otsResult.upgrade?.ok ? new Date().toISOString() : null,
    };

    // 3) 再讀一次 batch_versions.json，把這筆更新回去，再寫一次
    const raw2 = await fs.readFile(BATCH_VERSIONS_FILE, "utf8").catch(() => "");
    const db2 = JSON.parse(raw2 || "null") ?? { records: [] };
    const records2: any[] = Array.isArray(db2.records) ? db2.records : [];

    const idx2 = records2.findIndex(
      (r) =>
        String(r?.batchId) === batchId &&
        String(r?.batchVersionId) === batchVersionId
    );

    if (idx2 >= 0) records2[idx2] = newVersion;
    else records2.push(newVersion);

    await fs.writeFile(
      BATCH_VERSIONS_FILE,
      JSON.stringify({ records: records2 }, null, 2),
      "utf8"
    );
  }
}