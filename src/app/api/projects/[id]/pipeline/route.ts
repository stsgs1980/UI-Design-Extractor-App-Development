import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { pipelineRequestSchema } from '@/lib/validators';
import { runAnalyze, runSpec, runGenerate } from '@/lib/pipeline-steps';
import { serializeProject, serializeComponent, serializeToken } from '@/lib/serialize';
import { checkRateLimit } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rl = checkRateLimit(request, { windowMs: 120_000, maxRequests: 3 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many pipeline requests. Please wait.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = pipelineRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { codeFormat } = parsed.data;

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!project.rawHtml) {
      return NextResponse.json({ error: 'No HTML data. Extract the page first.' }, { status: 400 });
    }

    const zai = await ZAI.create();

    try {
      await runAnalyze(id, zai, project.componentQuery);
      await runSpec(id, zai);
      await runGenerate(id, zai, codeFormat);

      const finalProject = await db.project.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: {
          components: { orderBy: { createdAt: 'asc' } },
          tokens: { orderBy: { category: 'asc' } },
        },
      });

      return NextResponse.json({
        ...serializeProject(finalProject),
        components: finalProject.components.map(serializeComponent),
        tokens: finalProject.tokens.map(serializeToken),
      });
    } catch (pipelineError) {
      const msg = pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed';
      await db.project.update({ where: { id }, data: { status: 'FAILED', error: msg } });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
