// app/api/manufacturer/update/route.ts
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    const manufacturerName =
      String(body.manufacturerName || '').trim() || 'Manufacturer A';

    const product_name = String(body.product_name || '').trim() || 'Demo Product';
    const sku = String(body.sku || '').trim() || 'SKU-001';
    const qty = Number(body.qty || 0);

    if (!id) {
      return Response.json(
        { ok: false, error: '缺少批次 ID' },
        { status: 400 }
      );
    }

    const rows = await readRows();
    const idx = rows.findIndex((r) => String(r.id) === id);

    if (idx === -1) {
      return Response.json(
        { ok: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const row = rows[idx];

    row.manufacturer = {
      id: row.manufacturer?.id || 'M1',
      name: manufacturerName,
      ts: now,
      product_name,
      sku,
      qty,
    };

    rows[idx] = row;
    await writeRows(rows);

    return Response.json({ ok: true, batch: row });
  } catch (err) {
    console.error('Error in /api/manufacturer/update', err);
    return Response.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}