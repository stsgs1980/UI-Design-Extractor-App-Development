import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { createProjectSchema } from '@/lib/validators';
import { TO_VIEWPORT_TYPE } from '@/types/extractor';
import { serializeProject } from '@/lib/serialize';
import { checkRateLimit } from '@/lib/rate-limit';
import { safeUpdateProjectStatus } from '@/lib/safe-update';

// ---------- SDK helpers (local to this route) ----------

function cleanSdkError(raw: string): string {
  let cleaned = raw
    .replace(/\\u003c[^>]*\\u003e/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/Function invoke failed with status \d+: /, '')
    .replace(/Page reader failed: /, '')
    .replace(/request failed with status \d+: /, '')
    .replace(/\s*\{.*\}\s*/, '')
    .trim();
  if (!cleaned) cleaned = 'Page fetch failed. The site may be unreachable or blocking automated requests.';
  return cleaned;
}

async function fetchPageAndUpdate(projectId: string, url: string) {
  console.log('[api:projects:extract] starting background extraction for:', projectId, url);
  const zai = await ZAI.create();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await zai.functions.invoke('page_reader', { url });
      const title = result.data?.title || '';
      const html = result.data?.html || '';
      if (!html) throw new Error('Empty HTML received from page reader');

      console.log('[api:projects:extract] page fetched, title:', title, 'html length:', html.length);
      await db.project.update({
        where: { id: projectId },
        data: { pageTitle: title, rawHtml: html, status: 'EXTRACTED' },
      });
      console.log('[api:projects:extract] project extracted:', projectId);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[api:projects:extract] attempt ${attempt}/3 failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // All retries failed
  const rawMessage = lastError?.message || 'Extraction failed';
  console.error('[api:projects:extract] all retries failed:', rawMessage);
  const userMessage = cleanSdkError(rawMessage);
  await safeUpdateProjectStatus(projectId, 'FAILED', userMessage);
}

// ---------- Route handlers ----------

export async function GET() {
  try {
    console.log('[api:projects] GET /api/projects');
    const projects = await db.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        componentQuery: true,
        viewport: true,
        pageTitle: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { components: true, tokens: true },
        },
      },
    });
    console.log('[api:projects] returning', projects.length, 'projects');
    return NextResponse.json(projects.map(serializeProject));
  } catch (error) {
    console.error('[api:projects] GET FAILED:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    console.log('[api:projects] POST body:', { url: body.url, name: body.name, viewport: body.viewport });
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('[api:projects] validation failed:', parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { url, name, componentQuery, viewport } = parsed.data;
    const projectName = name || new URL(url).hostname;
    const prismaViewport = TO_VIEWPORT_TYPE[viewport] ?? 'DESKTOP';

    console.log('[api:projects] creating project:', projectName, url);
    const project = await db.project.create({
      data: {
        name: projectName,
        url,
        status: 'EXTRACTING',
        componentQuery: componentQuery || null,
        viewport: prismaViewport,
      },
    });

    console.log('[api:projects] project created:', project.id, '| starting background extraction');

    // Fire-and-forget: extract page in background, don't block the response
    fetchPageAndUpdate(project.id, url).catch((err) => {
      console.error('[api:projects] background extraction crashed:', err);
    });

    return NextResponse.json(serializeProject(project), { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 },
    );
  }
}
