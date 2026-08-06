import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SYSTEM_PROMPT = `You are a UI component specification expert. Generate detailed specifications for UI components.
You must respond with ONLY valid JSON, no markdown code blocks, no explanation.
The JSON must have this exact structure:
{
  "name": "string - component name",
  "description": "string - what this component does and when to use it",
  "props": [
    { "name": "string", "type": "string", "default": "string", "description": "string" }
  ],
  "variants": ["string - list of variant names"],
  "accessibility": ["string - list of accessibility considerations"],
  "dependencies": ["string - list of external dependencies or libraries"]
}`;

function stripMarkdownFences(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const project = await db.project.findUnique({
      where: { id },
      include: { components: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.components.length === 0) {
      return NextResponse.json({ error: 'No components to generate specs for' }, { status: 400 });
    }

    // Update status to speccing
    await db.project.update({
      where: { id },
      data: { status: 'speccing' },
    });

    try {
      const zai = await ZAI.create();
      const updatedComponents = [];

      for (const component of project.components) {
        const USER_PROMPT = `Generate a detailed specification for this UI component.

Component name: ${component.name}
HTML tag: ${component.tag || 'N/A'}
HTML:
${component.html}
CSS classes: ${component.cssClasses || 'N/A'}
Inline styles: ${component.inlineStyles || 'N/A'}

Provide a comprehensive spec including props, variants, accessibility notes, and dependencies.`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: SYSTEM_PROMPT },
            { role: 'user', content: USER_PROMPT },
          ],
          thinking: { type: 'disabled' },
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) continue;

        const cleanedResponse = stripMarkdownFences(response);

        // Validate it's parseable JSON
        try {
          JSON.parse(cleanedResponse);
        } catch {
          // If parsing fails, create a basic spec wrapper
          const fallbackSpec = JSON.stringify({
            name: component.name,
            description: cleanedResponse,
            props: [],
            variants: [],
            accessibility: [],
            dependencies: [],
          });

          const updated = await db.extractedComponent.update({
            where: { id: component.id },
            data: { spec: fallbackSpec },
          });
          updatedComponents.push(updated);
          continue;
        }

        const updated = await db.extractedComponent.update({
          where: { id: component.id },
          data: { spec: cleanedResponse },
        });
        updatedComponents.push(updated);
      }

      // Update project status to 'specced' (not 'completed')
      await db.project.update({
        where: { id },
        data: { status: 'specced' },
      });

      return NextResponse.json({ components: updatedComponents });
    } catch (specError) {
      await db.project.update({
        where: { id },
        data: {
          status: 'failed',
          error: specError instanceof Error ? specError.message : 'Spec generation failed',
        },
      });
      return NextResponse.json(
        { error: specError instanceof Error ? specError.message : 'Spec generation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to generate specs:', error);
    return NextResponse.json({ error: 'Failed to generate specs' }, { status: 500 });
  }
}
