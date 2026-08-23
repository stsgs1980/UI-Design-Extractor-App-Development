import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { pipelineRequestSchema } from '@/lib/validators';
import { runAnalyze, runSpec, runGenerate } from '@/lib/pipeline-steps';
import { serializeProject, serializeComponent, serializeToken } from '@/lib/serialize';
import { checkRateLimit } from '@/lib/rate-limit';
import { safeUpdateProjectStatus } from '@/lib/safe-update';

type RouteContext = { params: Promise<{ id: string }> };

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
      return NextResponse.json({ error: 'No HTML data. Extract the page first.' }, { status: 400 });
    }

    console.log('[api:pipeline] starting pipeline for:', project.name, '| html length:', project.rawHtml.length);
    const zai = await ZAI.create();

    try {
      console.log('[api:pipeline] step 1/3: analyze...');
      await runAnalyze(id, zai, project.componentQuery);
      console.log('[api:pipeline] step 2/3: spec...');
      await runSpec(id, zai);
      console.log('[api:pipeline] step 3/3: generate (' + codeFormat + ')...');
      await runGenerate(id, zai, codeFormat);

      const finalProject = await db.project.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: {
          components: { orderBy: { createdAt: 'asc' } },
          tokens: { orderBy: { category: 'asc' } },
        },
      });

      console.log('[api:pipeline] pipeline completed:', project.name);
      return NextResponse.json({
        ...serializeProject(finalProject),
        components: finalProject.components.map(serializeComponent),
        tokens: finalProject.tokens.map(serializeToken),
      });
    } catch (pipelineError) {
      const msg = pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed';
      console.error('[api:pipeline] step FAILED:', msg);
      await safeUpdateProjectStatus(id, 'FAILED', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('[api:pipeline] UNEXPECTED:', error);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
