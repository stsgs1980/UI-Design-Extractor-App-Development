import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { pipelineRequestSchema } from '@/lib/validators';
import { runAnalyze, runSpec, runGenerate } from '@/lib/pipeline-steps';
import { checkRateLimit } from '@/lib/rate-limit';
import { safeUpdateProjectStatus } from '@/lib/safe-update';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Run the full pipeline (analyze → spec → generate) in the background.
 * This function is NOT awaited — it runs after the 202 response is sent.
 */
async function runFullPipeline(projectId: string, codeFormat: string) {
  console.log('[pipeline:bg] starting pipeline for:', projectId, '| format:', codeFormat);
  const zai = await ZAI.create();

  try {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project || !project.rawHtml) {
      console.error('[pipeline:bg] project not found or no HTML:', projectId);
      await safeUpdateProjectStatus(projectId, 'FAILED', 'Project not found or no HTML data');
      return;
    }

    console.log('[pipeline:bg] step 1/3: analyze...');
    await runAnalyze(projectId, zai, project.componentQuery);

    console.log('[pipeline:bg] step 2/3: spec...');
    await runSpec(projectId, zai);

    console.log('[pipeline:bg] step 3/3: generate (' + codeFormat + ')...');
    await runGenerate(projectId, zai, codeFormat);

    await safeUpdateProjectStatus(projectId, 'COMPLETED');
    console.log('[pipeline:bg] pipeline completed:', projectId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline failed';
    console.error('[pipeline:bg] FAILED:', msg);
    await safeUpdateProjectStatus(projectId, 'FAILED', msg);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rl = checkRateLimit(request, { windowMs: 120_000, maxRequests: 3 });
    if (!rl.allowed) {
      console.warn('[api:pipeline] rate limited');
      return NextResponse.json(
        { error: 'Too many pipeline requests. Please wait.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = pipelineRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('[api:pipeline] validation failed:', parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { codeFormat } = parsed.data;
    console.log('[api:pipeline] POST /api/projects/', id, '/pipeline, format:', codeFormat);

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      console.warn('[api:pipeline] project not found:', id);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!project.rawHtml) {
      console.warn('[api:pipeline] no rawHtml for project:', id);
      return NextResponse.json({ error: 'No HTML data. Page is still being extracted — please wait.' }, { status: 400 });
    }
    if (project.status === 'COMPLETED') {
      console.warn('[api:pipeline] project already completed:', id);
      return NextResponse.json({ error: 'Pipeline already completed for this project.' }, { status: 400 });
    }
    if (project.status === 'FAILED') {
      console.log('[api:pipeline] restarting pipeline for failed project:', id);
    }
    if (['ANALYZING', 'SPECCING', 'GENERATING'].includes(project.status)) {
      console.warn('[api:pipeline] pipeline already running:', id, project.status);
      return NextResponse.json({ error: 'Pipeline is already running.' }, { status: 409 });
    }

    // Fire-and-forget: run pipeline in background, return 202 immediately
    runFullPipeline(id, codeFormat).catch((err) => {
      console.error('[api:pipeline] background pipeline crashed:', err);
    });

    console.log('[api:pipeline] pipeline started in background for:', id);
    return NextResponse.json({ accepted: true, message: 'Pipeline started' }, { status: 202 });
  } catch (error) {
    console.error('[api:pipeline] UNEXPECTED:', error);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
