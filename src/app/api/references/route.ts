import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveReferenceSchema } from '@/lib/validators';

export async function GET() {
  try {
    const references = await db.reference.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        component: {
          select: { id: true, name: true, projectId: true },
        },
      },
    });
    return NextResponse.json(references);
  } catch (error) {
    console.error('Failed to list references:', error);
    return NextResponse.json({ error: 'Failed to list references' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = saveReferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, description, sourceUrl, componentId, html, css, spec, tags } = parsed.data;

    const reference = await db.reference.create({
      data: {
        name,
        description: description || null,
        sourceUrl: sourceUrl || null,
        componentId: componentId || null,
        html,
        css: css || null,
        spec: spec || null,
        tags: JSON.stringify(tags || []),
      },
    });

    return NextResponse.json(reference, { status: 201 });
  } catch (error) {
    console.error('Failed to create reference:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reference' },
      { status: 500 },
    );
  }
}
