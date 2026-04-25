// app/api/recent/route.ts
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'chain.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, '[]');
  }
}

export async function GET(req: Request) {
  await ensureStore();

  const { searchParams } = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(50, Number(searchParams.get('limit') || 3))
  );

  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(() => '[]');
  let rows: any[] = [];
  try {
    const parsed = JSON.parse(raw || '[]');
    rows = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    rows = [];
  }

  // 依時間倒序（ts 越新的在前面）
  rows.sort((a, b) => String(b?.ts).localeCompare(String(a?.ts)));

  return Response.json({ ok: true, items: rows.slice(0, limit) });
}