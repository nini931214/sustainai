// app/api/recycler/create/route.ts
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'chain.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, '[]', 'utf8');
  }
}

async function readRows(): Promise<any[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(() => '[]');
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function writeRows(rows: any[]) {
  await fs.writeFile(DATA_PATH, JSON.stringify(rows, null, 2), 'utf8');
}

function generateBatchId(rows: any[]): string {
  const year = new Date().getFullYear();
  const prefix = `BATCH-${year}-`;
  const nums = rows
    .map((r) => String(r?.id ?? ''))
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));

  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const padded = String(next).padStart(3, '0');
  return `${prefix}${padded}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const material = String(body.material || '').trim() || 'PET';
    const kg = Number(body.kg || 0);
    const recyclerName = String(body.recyclerName || '').trim() || 'Recycler A';

    if (!kg || kg <= 0) {
      return Response.json(
        { ok: false, error: 'kg 必須大於 0' },
        { status: 400 }
      );
    }

    const rows = await readRows();
    const id = generateBatchId(rows);
    const now = Date.now();

    const newRow = {
      id,
      material,
      kg,
      recycler: {
        id: 'R1',
        name: recyclerName,
        ts: now,
      },
      ts: now,
    };

    rows.push(newRow);
    await writeRows(rows);

    return Response.json({ ok: true, batch: newRow });
  } catch (err) {
    console.error('Error in /api/recycler/create', err);
    return Response.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}