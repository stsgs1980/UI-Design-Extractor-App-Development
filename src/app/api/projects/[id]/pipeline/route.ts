import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { runAnalyze, runSpec, runGenerate } from '@/lib/pipeline-steps';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const codeFormat = body.codeFormat || 'html';

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
        data: { status: 'completed' },
        include: {
          components: { orderBy: { createdAt: 'asc' } },
          tokens: { orderBy: { category: 'asc' } },
        },
      });

      return NextResponse.json(finalProject);
    } catch (pipelineError) {
      const msg = pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed';
      await db.project.update({ where: { id }, data: { status: 'failed', error: msg } });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
