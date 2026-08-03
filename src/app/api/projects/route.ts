import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

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
      // Use ZAI SDK to fetch page
      const zai = await ZAI.create();
      const result = await zai.functions.invoke('page_reader', { url });

      const pageTitle = result.data?.title || projectName;
      const rawHtml = result.data?.html || '';

      // Update project with extracted data
      const updatedProject = await db.project.update({
        where: { id: project.id },
        data: {
          pageTitle,
          rawHtml,
          status: 'completed',
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
      // Update project status to failed
      const failedProject = await db.project.update({
        where: { id: project.id },
        data: {
          status: 'failed',
          error: extractError instanceof Error ? extractError.message : 'Extraction failed',
        },
      });
      return NextResponse.json({
        id: failedProject.id,
        name: failedProject.name,
        url: failedProject.url,
        status: failedProject.status,
        error: failedProject.error,
        createdAt: failedProject.createdAt,
        updatedAt: failedProject.updatedAt,
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
