import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const FILE = path.join(process.cwd(), "app", "data", "batch_versions.json");

/* --- same hash helpers --- */
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hashJson(obj: any) {
  return sha256Hex(stableStringify(obj));
}

export async function verifyChainByBatchId(batchId: string) {
  let store: any;

  try {
    const txt = await fs.readFile(FILE, "utf8");
    store = JSON.parse(txt);
  } catch {
    return { ok: false, reason: "CHAIN_FILE_MISSING", checked: 0 };
  }

  const chain = (store.versions || []).filter(
    (v: any) => v.batchId === batchId
  );

  if (chain.length === 0) {
    return { ok: false, reason: "NO_VERSIONS", checked: 0 };
  }

  for (let i = 0; i < chain.length; i++) {
    const { recordHash, ...rest } = chain[i];
    const expected = hashJson(rest);

    if (expected !== recordHash) {
      return {
        ok: false,
        reason: "RECORD_HASH_MISMATCH",
        brokenAt: i + 1,
        checked: i + 1,
      };
    }

    if (i > 0 && chain[i].prevHash !== chain[i - 1].recordHash) {
      return {
        ok: false,
        reason: "PREV_HASH_BROKEN",
        brokenAt: i + 1,
        checked: i + 1,
      };
    }
  }

  return {
    ok: true,
    checked: chain.length,
    headRecordHash: chain.at(-1).recordHash,
  };
}