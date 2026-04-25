// lib/ots.ts
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";

const execFileAsync = util.promisify(execFile);

const OTS_CMD = process.env.OTS_CMD || "ots";

/* =========================
 * 你已經在用的 AUTO-SEAL
 * ========================= */
export async function sealOtsFromHashHex(opts: {
  hashHex: string;
  outDir: string;
  fileStem: string;
  tryUpgrade?: boolean;
}) {
  const { hashHex, outDir, fileStem, tryUpgrade } = opts;

  await fs.mkdir(outDir, { recursive: true });

  const hashFile = path.join(outDir, `${fileStem}.hash`);
  const otsFile = `${hashFile}.ots`;

  await fs.writeFile(hashFile, `${hashHex}\n`, "utf8");

  // stamp
  let stampOk = false;
  try {
    await execFileAsync(OTS_CMD, ["stamp", hashFile]);
    stampOk = true;
  } catch {
    stampOk = false;
  }

  // upgrade（不阻斷）
  let upgradeOk = false;
  if (tryUpgrade && stampOk) {
    try {
      await execFileAsync(OTS_CMD, ["upgrade", otsFile]);
      upgradeOk = true;
    } catch {
      upgradeOk = false;
    }
  }

  return {
    stamp: { ok: stampOk },
    upgrade: upgradeOk ? { ok: true } : null,
  };
}

/* =========================
 * ✅ 這就是你缺的 export
 * ========================= */
export async function getOtsInfoResult(otsFile: string) {
  try {
    const { stdout } = await execFileAsync(OTS_CMD, ["info", otsFile]);
    return {
      status: "present",
      rawInfo: stdout,
      verified: stdout.includes("Bitcoin block"),
      verifyError: null,
    };
  } catch (err: any) {
    return {
      status: "error",
      rawInfo: "",
      verified: false,
      verifyError: String(err?.message || err),
    };
  }
}