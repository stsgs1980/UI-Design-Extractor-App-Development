import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function stripMarkdownFences(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```(?:html|react|vue|jsx|tsx)?\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

const ANALYZE_SYSTEM_PROMPT = `You are a UI analysis expert. Extract components and design tokens from HTML.
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

const SPEC_SYSTEM_PROMPT = `You are a UI component specification expert. Generate detailed specifications for UI components.
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

const GENERATE_SYSTEM_PROMPT = `You are a clean code generation expert. Generate standalone, reusable UI component code from specifications.
You must respond with ONLY the generated code, no markdown code blocks, no explanation, no commentary.`;

async function runAnalyze(projectId: string, zai: Awaited<ReturnType<typeof ZAI.create>>) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !project.rawHtml) {
    throw new Error('No HTML data to analyze');
  }

  await db.project.update({ where: { id: projectId }, data: { status: 'analyzing' } });

  const USER_PROMPT = `Analyze the following HTML and extract all reusable UI components and design tokens.

Focus on:
1. Identifying distinct UI components (buttons, cards, navbars, forms, etc.)
2. Extracting design tokens (colors, spacing, typography, shadows, border-radius, opacity)
3. Capturing CSS custom properties from :root or style blocks

HTML to analyze:
${project.rawHtml.substring(0, 50000)}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT },
    ],
    thinking: { type: 'disabled' },
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) throw new Error('Empty LLM response during analysis');

  const parsed = JSON.parse(stripMarkdownFences(response));

  // Clear existing data
  await db.extractedComponent.deleteMany({ where: { projectId } });
  await db.designToken.deleteMany({ where: { projectId } });

  // Create components
  await Promise.all(
    (parsed.components || []).map((comp: { name: string; tag?: string | null; html: string; cssClasses?: string | null; inlineStyles?: string | null }) =>
      db.extractedComponent.create({
        data: {
          projectId,
          name: comp.name,
          tag: comp.tag || null,
          html: comp.html,
          cssClasses: comp.cssClasses || null,
          inlineStyles: comp.inlineStyles || null,
        },
      })
    )
  );

  // Create tokens
  await Promise.all(
    (parsed.designTokens || []).map((token: { category: string; name: string; value: string; originalVar?: string | null }) =>
      db.designToken.create({
        data: {
          projectId,
          category: token.category,
          name: token.name,
          value: token.value,
          originalVar: token.originalVar || null,
        },
      })
    )
  );
}

async function runSpec(projectId: string, zai: Awaited<ReturnType<typeof ZAI.create>>) {
  const components = await db.extractedComponent.findMany({
    where: { projectId },
  });

  if (components.length === 0) throw new Error('No components to generate specs for');

  await db.project.update({ where: { id: projectId }, data: { status: 'speccing' } });

  for (const component of components) {
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
        { role: 'assistant', content: SPEC_SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) continue;

    const cleanedResponse = stripMarkdownFences(response);

    // Validate JSON, fallback to wrapper
    try {
      JSON.parse(cleanedResponse);
    } catch {
      await db.extractedComponent.update({
        where: { id: component.id },
        data: {
          spec: JSON.stringify({ name: component.name, description: cleanedResponse, props: [], variants: [], accessibility: [], dependencies: [] }),
        },
      });
      continue;
    }

    await db.extractedComponent.update({
      where: { id: component.id },
      data: { spec: cleanedResponse },
    });
  }
}

async function runGenerate(projectId: string, zai: Awaited<ReturnType<typeof ZAI.create>>, codeFormat: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { components: true, tokens: true },
  });
  if (!project) throw new Error('Project not found');

  const componentsWithSpecs = project.components.filter((c) => c.spec);
  if (componentsWithSpecs.length === 0) throw new Error('No components with specs to generate code from');

  await db.project.update({ where: { id: projectId }, data: { status: 'generating' } });

  const tokensContext = project.tokens.length > 0
    ? `\n\nDesign tokens available:\n${project.tokens.map((t) => `${t.name}: ${t.value} (${t.category})`).join('\n')}`
    : '';

  const formatInstructions: Record<string, string> = {
    html: 'Generate clean, standalone HTML with embedded CSS in a <style> tag. Use semantic HTML. The code should be self-contained and work by itself in a browser.',
    react: 'Generate a clean React component (JSX). Use TypeScript. Include a default export. Use inline styles or a style object. Do not use external CSS files.',
    vue: 'Generate a clean Vue 3 SFC (Single File Component) using <template>, <script setup lang="ts">, and <style scoped> tags.',
  };

  for (const component of componentsWithSpecs) {
    const USER_PROMPT = `Generate a ${codeFormat.toUpperCase()} component based on this specification:

Component Specification:
${component.spec}

Original HTML reference:
${component.html}
${tokensContext}

${formatInstructions[codeFormat] || formatInstructions.html}

Generate ONLY the code, nothing else. No explanations, no markdown fences.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: GENERATE_SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) continue;

    await db.extractedComponent.update({
      where: { id: component.id },
      data: {
        generatedCode: stripMarkdownFences(response),
        codeFormat,
      },
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const codeFormat = body.codeFormat || 'html';

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.rawHtml) {
      return NextResponse.json({ error: 'No HTML data. Extract the page first.' }, { status: 400 });
    }

    const zai = await ZAI.create();

    try {
      // Step 1: Analyze
      await runAnalyze(id, zai);

      // Step 2: Spec
      await runSpec(id, zai);

      // Step 3: Generate
      await runGenerate(id, zai, codeFormat);

      // Mark completed and return final state
      const finalProject = await db.project.update({
        where: { id },
        data: { status: 'completed' },
        include: {
          components: { orderBy: { createdAt: 'asc' } },
          tokens: { orderBy: { category: 'asc' } },
        },
      });

      return NextResponse.json(finalProject);
    } catch (pipelineError) {
      await db.project.update({
        where: { id },
        data: {
          status: 'failed',
          error: pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed',
        },
      });
      return NextResponse.json(
        { error: pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
