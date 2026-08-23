import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { runAnalyze } from '@/lib/pipeline-steps';
import { serializeComponent, serializeToken } from '@/lib/serialize';
import { safeUpdateProjectStatus } from '@/lib/safe-update';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!project.rawHtml) {
      return NextResponse.json({ error: 'No HTML data. Extract the page first.' }, { status: 400 });
    }

    try {
      const zai = await ZAI.create();
      const result = await runAnalyze(id, zai, project.componentQuery);

      await safeUpdateProjectStatus(id, 'ANALYZED');

      return NextResponse.json({
        components: result.components.map(serializeComponent),
        tokens: result.tokens.map(serializeToken),
      });
    } catch (analyzeError) {
      const msg = analyzeError instanceof Error ? analyzeError.message : 'Analysis failed';
      await safeUpdateProjectStatus(id, 'FAILED', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to analyze project:', error);
    return NextResponse.json({ error: 'Failed to analyze project' }, { status: 500 });
  }
}
