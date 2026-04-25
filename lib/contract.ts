// lib/contract.ts
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const TOKEN_PATH = path.join(DATA_DIR, "tokens.json");
const LEDGER_PATH = path.join(DATA_DIR, "ledger.json");

type Token = {
  tokenId: string;
  batchId: string;
  material: string;
  weightKg: number;
  recycler: string;
  processor?: string;
  manufacturer?: string;
  status: "minted" | "processed" | "used";
  issuedAt: string;
  processedAt?: string;
  usedAt?: string;
  meta?: any;
};

type Ledger = Record<string, number>;

async function readJSON(p: string) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

async function writeJSON(p: string, data: any) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

export async function mintTokenFromRecycle({
  batchId,
  material,
  weightKg,
  recycler,
  meta,
}: any) {
  const tokens: Token[] = await readJSON(TOKEN_PATH);
  const id = `T-${Date.now().toString(36)}`;
  const t: Token = {
    tokenId: id,
    batchId,
    material,
    weightKg,
    recycler,
    status: "minted",
    issuedAt: new Date().toISOString(),
    meta,
  };
  tokens.push(t);
  await writeJSON(TOKEN_PATH, tokens);
  return t;
}

export async function getToken(tokenId: string) {
  const tokens: Token[] = await readJSON(TOKEN_PATH);
  return tokens.find((t) => t.tokenId === tokenId);
}

export async function listTokensByBatch(batchId: string) {
  const tokens: Token[] = await readJSON(TOKEN_PATH);
  return tokens.filter((t) => t.batchId === batchId);
}

export async function processToken(tokenId: string, processor: string, meta: any) {
  const tokens: Token[] = await readJSON(TOKEN_PATH);
  const t = tokens.find((x) => x.tokenId === tokenId);
  if (!t) throw new Error("token not found");
  if (t.status !== "minted") throw new Error("invalid status");
  t.status = "processed";
  t.processor = processor;
  t.processedAt = new Date().toISOString();
  t.meta = { ...t.meta, ...meta };
  await writeJSON(TOKEN_PATH, tokens);
  await recordLedger(processor, t.recycler, 3 * t.weightKg);
  return t;
}

export async function useToken(tokenId: string, manufacturer: string, meta: any) {
  const tokens: Token[] = await readJSON(TOKEN_PATH);
  const t = tokens.find((x) => x.tokenId === tokenId);
  if (!t) throw new Error("token not found");
  if (t.status !== "processed") throw new Error("invalid status");
  t.status = "used";
  t.manufacturer = manufacturer;
  t.usedAt = new Date().toISOString();
  t.meta = { ...t.meta, ...meta };
  await writeJSON(TOKEN_PATH, tokens);
  if (t.processor) await recordLedger(manufacturer, t.processor, 6 * t.weightKg);
  return t;
}

export async function recordLedger(from: string, to: string, amount: number) {
  const ledger: Ledger = await readJSON(LEDGER_PATH);
  ledger[from] = (ledger[from] || 0) - amount;
  ledger[to] = (ledger[to] || 0) + amount;
  await writeJSON(LEDGER_PATH, ledger);
  return ledger;
}

export async function readBalances() {
  return await readJSON(LEDGER_PATH);
}