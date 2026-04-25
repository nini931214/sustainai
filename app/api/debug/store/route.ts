import { NextResponse } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
const DATA_FILE = path.join(process.cwd(), 'data', 'chain.json');

export async function GET() {
  const exists = fs.existsSync(DATA_FILE);
  let keys: string[] = [];
  let size = 0;
  if (exists) {
    const stat = await fsp.stat(DATA_FILE);
    size = stat.size;
    const obj = JSON.parse(await fsp.readFile(DATA_FILE, 'utf8') || '{}');
    keys = Object.keys(obj);
  }
  return NextResponse.json({ ok:true, cwd: process.cwd(), file: DATA_FILE, exists, size, keys });
}