import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'dev.log');
const MAX_LINES = 300;

export async function GET() {
  try {
    if (!existsSync(LOG_FILE)) {
      return NextResponse.json({ lines: [], total: 0 });
    }

    const raw = await readFile(LOG_FILE, 'utf-8');
    const allLines = raw.split('\n').filter((l) => l.trim());
    const total = allLines.length;
    const lines = allLines.slice(-MAX_LINES);

    return NextResponse.json({ lines, total });
  } catch (error) {
    console.error('[api:logs] failed to read dev.log:', error);
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}
