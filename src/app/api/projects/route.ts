import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { createProjectSchema } from '@/lib/validators';
import { TO_VIEWPORT_TYPE } from '@/types/extractor';
import { serializeProject } from '@/lib/serialize';
import { checkRateLimit } from '@/lib/rate-limit';

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

async function fetchPageWithRetry(url: string, retries = 3): Promise<{ title: string; html: string }> {
  const zai = await ZAI.create();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await zai.functions.invoke('page_reader', { url });
      const title = result.data?.title || '';
      const html = result.data?.html || '';
      if (!html) throw new Error('Empty HTML received from page reader');
      return { title, html };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`page_reader attempt ${attempt}/${retries} failed for ${url}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error('Page fetch failed after retries');
}

// ---------- Route handlers ----------

export async function GET() {
  try {
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
    return NextResponse.json(projects.map(serializeProject));
  } catch (error) {
    console.error('Failed to list projects:', error);
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
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { url, name, componentQuery, viewport } = parsed.data;
    const projectName = name || new URL(url).hostname;
    const prismaViewport = TO_VIEWPORT_TYPE[viewport] ?? 'DESKTOP';

    const project = await db.project.create({
      data: {
        name: projectName,
        url,
        status: 'EXTRACTING',
        componentQuery: componentQuery || null,
        viewport: prismaViewport,
      },
    });

    try {
      const { title: pageTitle, html: rawHtml } = await fetchPageWithRetry(url);

      const updatedProject = await db.project.update({
        where: { id: project.id },
        data: { pageTitle, rawHtml, status: 'EXTRACTED' },
      });

      return NextResponse.json(serializeProject(updatedProject));
    } catch (extractError) {
      const rawMessage = extractError instanceof Error ? extractError.message : 'Extraction failed';
      const userMessage = cleanSdkError(rawMessage);

      const failedProject = await db.project.update({
        where: { id: project.id },
        data: { status: 'FAILED', error: userMessage },
      });

      return NextResponse.json(serializeProject(failedProject), { status: 422 });
    }
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 },
    );
  }
}
