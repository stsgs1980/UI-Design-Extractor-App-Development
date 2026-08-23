import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { runSpec } from '@/lib/pipeline-steps';
import { serializeComponent } from '@/lib/serialize';
import { safeUpdateProjectStatus } from '@/lib/safe-update';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const project = await db.project.findUnique({ where: { id }, include: { components: true } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.components.length === 0) {
      return NextResponse.json({ error: 'No components to generate specs for' }, { status: 400 });
    }

    try {
      const zai = await ZAI.create();
      const components = await runSpec(id, zai);

      await safeUpdateProjectStatus(id, 'SPECCED');

      return NextResponse.json({ components: components.map(serializeComponent) });
    } catch (specError) {
      const msg = specError instanceof Error ? specError.message : 'Spec generation failed';
      await safeUpdateProjectStatus(id, 'FAILED', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to generate specs:', error);
    return NextResponse.json({ error: 'Failed to generate specs' }, { status: 500 });
  }
}
