import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { llmWithRetry } from '@/lib/llm-retry';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SYSTEM_PROMPT = `You are a UI analysis expert. Extract components and design tokens from HTML.
You must respond with ONLY valid JSON, no markdown code blocks, no explanation.
Extract at most 8 most important/visible components. For each component, include only the essential outer HTML (keep under 500 characters).

CRITICAL: In the "html" field, replace all double quotes with single quotes. This prevents JSON parsing errors.

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

function repairJson(text: string): string {
  let fixed = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ');
  fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  try { JSON.parse(fixed); return fixed; } catch {}
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');
  try { JSON.parse(fixed); return fixed; } catch {}
  let lastAttempt = fixed;
  let pos = fixed.length;
  while (pos > 0) {
    pos = fixed.lastIndexOf('}', pos - 1);
    if (pos < 0) break;
    let candidate = fixed.substring(0, pos + 1);
    let ob = 0, oc = 0, inStr = false, escaped = false;
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '[') ob++; if (ch === ']') ob--;
      if (ch === '{') oc++; if (ch === '}') oc--;
    }
    if (inStr) candidate += '"';
    while (oc > 0) { candidate += '}'; oc--; }
    while (ob > 0) { candidate += ']'; ob--; }
    try {
      const parsed = JSON.parse(candidate);
      lastAttempt = candidate;
      if (parsed.components || parsed.designTokens) return candidate;
    } catch {}
  }
  return lastAttempt;
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
      return NextResponse.json({ error: 'No HTML data to analyze. Extract the page first.' }, { status: 400 });
    }

    // Update status to analyzing
    await db.project.update({
      where: { id },
      data: { status: 'analyzing' },
    });

    try {
      const zai = await ZAI.create();

      // Build focus instruction from componentQuery
      const focusInstruction = project.componentQuery
        ? `\n\nIMPORTANT: Focus ONLY on these component types: ${project.componentQuery}. Ignore other elements.`
        : '';

      const USER_PROMPT = `Analyze the following HTML and extract all reusable UI components and design tokens.

Focus on:
1. Identifying distinct UI components (buttons, cards, navbars, forms, etc.)
2. Extracting design tokens (colors, spacing, typography, shadows, border-radius, opacity)
3. Capturing CSS custom properties from :root or style blocks
${focusInstruction}
HTML to analyze:
${project.rawHtml.substring(0, 20000)}`;

      const completion = await llmWithRetry(zai, {
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
      const parsed = JSON.parse(repairJson(cleanedResponse));

      // Delete existing components and tokens for this project
      await db.extractedComponent.deleteMany({ where: { projectId: id } });
      await db.designToken.deleteMany({ where: { projectId: id } });

      // Filter valid components (html is required, name is required)
      const validComponents = (parsed.components || []).filter(
        (comp: { name?: string; html?: string | null }) =>
          comp.name && comp.html && typeof comp.html === 'string' && comp.html.trim().length > 0
      );

      if (validComponents.length === 0) {
        throw new Error('No valid components found in the analysis. The page may be too simple or the LLM could not parse it.');
      }

      // Create components
      const componentPromises = validComponents.map(
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

      // Create design tokens (filter invalid entries)
      const validTokens = (parsed.designTokens || []).filter(
        (t: { name?: string; value?: string | null; category?: string | null }) =>
          t.name && t.value && t.category
      );

      const tokenPromises = validTokens.map(
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

      // Update project status to 'analyzed' (not 'completed')
      await db.project.update({
        where: { id },
        data: { status: 'analyzed' },
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
