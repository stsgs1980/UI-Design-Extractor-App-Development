import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeStatus, serializeViewport } from '@/lib/serialize';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Lightweight status endpoint for polling.
 * Excludes rawHtml and component/token data to keep responses small.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await db.project.findUnique({
      where: { id },
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

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...project,
      status: serializeStatus(project.status),
      viewport: serializeViewport(project.viewport),
    });
  } catch (error) {
    console.error('Failed to get project status:', error);
    return NextResponse.json({ error: 'Failed to get project status' }, { status: 500 });
  }
}
