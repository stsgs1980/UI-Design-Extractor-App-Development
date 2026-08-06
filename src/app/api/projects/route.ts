import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

function cleanSdkError(raw: string): string {
  // Strip escaped HTML, SDK wrappers, and nginx error pages
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
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        console.warn(`page_reader attempt ${attempt}/${retries} failed for ${url}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error('Page fetch failed after retries');
}

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
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, name, componentQuery, viewport } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const projectName = name || new URL(url).hostname;

    // Create project with extracting status
    const project = await db.project.create({
      data: {
        name: projectName,
        url,
        status: 'extracting',
        componentQuery: componentQuery || null,
        viewport: viewport || 'desktop',
      },
    });

    try {
      // Fetch page with retry
      const { title: pageTitle, html: rawHtml } = await fetchPageWithRetry(url);

      // Update project with extracted data
      const updatedProject = await db.project.update({
        where: { id: project.id },
        data: {
          pageTitle,
          rawHtml,
          status: 'extracted',
        },
      });

      const resultProject = {
        id: updatedProject.id,
        name: updatedProject.name,
        url: updatedProject.url,
        status: updatedProject.status,
        componentQuery: updatedProject.componentQuery,
        viewport: updatedProject.viewport,
        pageTitle: updatedProject.pageTitle,
        error: updatedProject.error,
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt,
      };
      return NextResponse.json(resultProject);
    } catch (extractError) {
      const rawMessage = extractError instanceof Error ? extractError.message : 'Extraction failed';
      const userMessage = cleanSdkError(rawMessage);

      // Update project status to failed
      const failedProject = await db.project.update({
        where: { id: project.id },
        data: {
          status: 'failed',
          error: userMessage,
        },
      });

      // Return HTTP 422 so the frontend knows extraction failed
      return NextResponse.json(
        {
          id: failedProject.id,
          name: failedProject.name,
          url: failedProject.url,
          status: failedProject.status,
          error: failedProject.error,
          createdAt: failedProject.createdAt,
          updatedAt: failedProject.updatedAt,
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
