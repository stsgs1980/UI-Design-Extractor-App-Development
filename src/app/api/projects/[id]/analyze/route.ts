import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SYSTEM_PROMPT = `You are a UI analysis expert. Extract components and design tokens from HTML.
You must respond with ONLY valid JSON, no markdown code blocks, no explanation.
The JSON must have this exact structure:
{
  "components": [
    {
      "name": "string - descriptive component name",
      "tag": "string - HTML tag name or null",
      "html": "string - the outer HTML of the component",
      "cssClasses": "string - CSS class names or null",
      "inlineStyles": "string - inline styles or null"
    }
  ],
  "designTokens": [
    {
      "category": "string - one of: color, spacing, typography, border-radius, shadow, opacity",
      "name": "string - token name",
      "value": "string - token value",
      "originalVar": "string - original CSS variable name or null"
    }
  ]
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
      include: { components: true, tokens: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.rawHtml) {
      return NextResponse.json({ error: 'No HTML data to analyze' }, { status: 400 });
    }

    // Update status to analyzing
    await db.project.update({
      where: { id },
      data: { status: 'analyzing' },
    });

    try {
      const zai = await ZAI.create();

      const USER_PROMPT = `Analyze the following HTML and extract all reusable UI components and design tokens.

Focus on:
1. Identifying distinct UI components (buttons, cards, navbars, forms, etc.)
2. Extracting design tokens (colors, spacing, typography, shadows, border-radius, opacity)
3. Capturing CSS custom properties from :root or style blocks

HTML to analyze:
${project.rawHtml.substring(0, 50000)}`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT },
        ],
        thinking: { type: 'disabled' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Empty LLM response');
      }

      const cleanedResponse = stripMarkdownFences(response);
      const parsed = JSON.parse(cleanedResponse);

      // Delete existing components and tokens for this project
      await db.extractedComponent.deleteMany({ where: { projectId: id } });
      await db.designToken.deleteMany({ where: { projectId: id } });

      // Create components
      const componentPromises = (parsed.components || []).map(
        async (comp: {
          name: string;
          tag?: string | null;
          html: string;
          cssClasses?: string | null;
          inlineStyles?: string | null;
        }) => {
          return db.extractedComponent.create({
            data: {
              projectId: id,
              name: comp.name,
              tag: comp.tag || null,
              html: comp.html,
              cssClasses: comp.cssClasses || null,
              inlineStyles: comp.inlineStyles || null,
            },
          });
        }
      );

      // Create design tokens
      const tokenPromises = (parsed.designTokens || []).map(
        async (token: {
          category: string;
          name: string;
          value: string;
          originalVar?: string | null;
        }) => {
          return db.designToken.create({
            data: {
              projectId: id,
              category: token.category,
              name: token.name,
              value: token.value,
              originalVar: token.originalVar || null,
            },
          });
        }
      );

      const [createdComponents, createdTokens] = await Promise.all([
        Promise.all(componentPromises),
        Promise.all(tokenPromises),
      ]);

      // Update project status
      await db.project.update({
        where: { id },
        data: { status: 'completed' },
      });

      return NextResponse.json({
        components: createdComponents,
        tokens: createdTokens,
      });
    } catch (analyzeError) {
      await db.project.update({
        where: { id },
        data: {
          status: 'failed',
          error: analyzeError instanceof Error ? analyzeError.message : 'Analysis failed',
        },
      });
      return NextResponse.json(
        { error: analyzeError instanceof Error ? analyzeError.message : 'Analysis failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to analyze project:', error);
    return NextResponse.json({ error: 'Failed to analyze project' }, { status: 500 });
  }
}
