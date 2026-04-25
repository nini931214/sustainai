// app/lib/chain/writeBatchVersion.ts
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const VERSION_FILE = path.join(DATA_DIR, "batch_versions.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(VERSION_FILE);
  } catch {
    await fs.writeFile(VERSION_FILE, "[]", "utf8");
  }
}

export type BatchVersionRecord = {
  batchId: string;
  batchVersionId: string;
  payloadHash: string;
  prevHash?: string;
  ts: number;
};

export async function writeBatchVersion(input: {
  batchId: string;
  payload: unknown;
}) {
  await ensureStore();

  const raw = await fs.readFile(VERSION_FILE, "utf8").catch(() => "[]");
  const list: BatchVersionRecord[] = JSON.parse(raw || "[]");

  const payloadJson = JSON.stringify(input.payload);
  const payloadHash = crypto
    .createHash("sha256")
    .update(payloadJson)
    .digest("hex");

  const prev = list
    .filter((r) => r.batchId === input.batchId)
    .slice(-1)[0];

  const ts = Date.now();
  const batchVersionId = `${input.batchId}@ts:${ts}`;

  const record: BatchVersionRecord = {
    batchId: input.batchId,
    batchVersionId,
    payloadHash,
    prevHash: prev?.payloadHash,
    ts,
  };

  list.push(record);

  await fs.writeFile(VERSION_FILE, JSON.stringify(list, null, 2), "utf8");

  return record;
}