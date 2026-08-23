import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeProject, serializeComponent, serializeToken } from '@/lib/serialize';
import { PROCESSING_STATUSES } from '@/lib/safe-update';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        components: { orderBy: { createdAt: 'asc' } },
        tokens: { orderBy: { category: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...serializeProject(project),
      components: project.components.map(serializeComponent),
      tokens: project.tokens.map(serializeToken),
    });
  } catch (error) {
    console.error('Failed to get project:', error);
    return NextResponse.json({ error: 'Failed to get project' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    console.log('[api:delete] DELETE /api/projects/', id);

    const project = await db.project.findUnique({ where: { id } });
    console.log('[api:delete] project found:', !!project, project?.name, '| status:', project?.status);

    if (!project) {
      console.warn('[api:delete] project not found:', id);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (PROCESSING_STATUSES.includes(project.status)) {
      console.warn('[api:delete] cannot delete, project is being processed:', id, project.status);
      return NextResponse.json(
        { error: `Cannot delete project while it is being processed (status: ${project.status})` },
        { status: 409 },
      );
    }

    const components = await db.extractedComponent.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    console.log('[api:delete] components to clean:', components.length);

    if (components.length > 0) {
      const refResult = await db.reference.deleteMany({
        where: { componentId: { in: components.map((c) => c.id) } },
      });
      console.log('[api:delete] references deleted:', refResult.count);
    }

    await db.project.delete({ where: { id } });
    console.log('[api:delete] project deleted successfully:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api:delete] FAILED:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
