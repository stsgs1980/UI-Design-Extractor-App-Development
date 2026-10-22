import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'dev.log');
const MAX_LINES = 300;
const MAX_LINE_LENGTH = 2000;

/** Sanitize a single log line: strip binary chars, truncate if too long. */
function sanitizeLine(line: string): string {
  // Remove null bytes and other control characters (keep \t and normal whitespace)
  let clean = line.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  // Trim whitespace
  clean = clean.trim();
  // Truncate very long lines (e.g. prisma queries) with ellipsis
  if (clean.length > MAX_LINE_LENGTH) {
    clean = clean.substring(0, MAX_LINE_LENGTH) + ' ...';
  }
  return clean;
}

export async function GET() {
  try {
    if (!existsSync(LOG_FILE)) {
      return NextResponse.json({ lines: [], total: 0 });
    }

    const raw = await readFile(LOG_FILE, 'utf-8');
    const allLines = raw
      .split('\n')
      .map(sanitizeLine)
      .filter((l) => l.length > 0);
    const total = allLines.length;
    const lines = allLines.slice(-MAX_LINES);

    return NextResponse.json({ lines, total });
  } catch (error) {
    console.error('[api:logs] failed to read dev.log:', error);
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}

/** Truncate the dev.log file (clear logs). */
export async function POST() {
  try {
    await writeFile(LOG_FILE, '', 'utf-8');
    console.log('[api:logs] logs cleared');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api:logs] failed to clear dev.log:', error);
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
