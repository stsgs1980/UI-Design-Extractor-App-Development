import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { runGenerate } from '@/lib/pipeline-steps';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const codeFormat = body.codeFormat || 'html';

    const project = await db.project.findUnique({ where: { id }, include: { components: true } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const componentsWithSpecs = project.components.filter((c) => c.spec);
    if (componentsWithSpecs.length === 0) {
      return NextResponse.json({ error: 'No components with specs to generate code from' }, { status: 400 });
    }

    try {
      const zai = await ZAI.create();
      const components = await runGenerate(id, zai, codeFormat);

      await db.project.update({ where: { id }, data: { status: 'completed' } });

      return NextResponse.json({ components });
    } catch (generateError) {
      const msg = generateError instanceof Error ? generateError.message : 'Code generation failed';
      await db.project.update({ where: { id }, data: { status: 'failed', error: msg } });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to generate code:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}
