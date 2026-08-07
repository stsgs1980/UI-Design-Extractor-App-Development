import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { llmWithRetry, sleep } from '@/lib/llm-retry';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SYSTEM_PROMPT = `You are a clean code generation expert. Generate standalone, reusable UI component code from specifications.
You must respond with ONLY the generated code, no markdown code blocks, no explanation, no commentary.`;

function stripMarkdownFences(text: string): string {
  return text
    .replace(/```(?:html|react|vue|jsx|tsx)?\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const codeFormat = body.codeFormat || 'html';

    const project = await db.project.findUnique({
      where: { id },
      include: { components: true, tokens: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const componentsWithSpecs = project.components.filter((c) => c.spec);
    if (componentsWithSpecs.length === 0) {
      return NextResponse.json(
        { error: 'No components with specs to generate code from' },
        { status: 400 }
      );
    }

    await db.project.update({
      where: { id },
      data: { status: 'generating' },
    });

    const zai = await ZAI.create();

    const tokensContext = project.tokens.length > 0
      ? `\n\nDesign tokens available:\n${project.tokens.map((t) => `${t.name}: ${t.value} (${t.category})`).join('\n')}`
      : '';

    const formatInstructions: Record<string, string> = {
      html: 'Generate clean, standalone HTML with embedded CSS in a <style> tag. Use semantic HTML. The code should be self-contained and work by itself in a browser.',
      react: 'Generate a clean React component (JSX). Use TypeScript. Include a default export. Use inline styles or a style object. Do not use external CSS files.',
      vue: 'Generate a clean Vue 3 SFC (Single File Component) using <template>, <script setup lang="ts">, and <style scoped> tags.',
    };

    let genErrors = 0;
    const updatedComponents = [];

    for (const component of componentsWithSpecs) {
      try {
        const USER_PROMPT = `Generate a ${codeFormat.toUpperCase()} component based on this specification:

Component Specification:
${component.spec}

Original HTML reference:
${component.html}
${tokensContext}

${formatInstructions[codeFormat] || formatInstructions.html}

Generate ONLY the code, nothing else. No explanations, no markdown fences.`;

        const completion = await llmWithRetry(zai, {
          messages: [
            { role: 'assistant', content: SYSTEM_PROMPT },
            { role: 'user', content: USER_PROMPT },
          ],
          thinking: { type: 'disabled' },
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) { genErrors++; continue; }

        // Throttle between generate calls
        if (componentsWithSpecs.indexOf(component) < componentsWithSpecs.length - 1) {
          await sleep(1500);
        }

        // Reload to guard against race conditions
        const exists = await db.extractedComponent.findUnique({ where: { id: component.id } });
        if (!exists) { genErrors++; continue; }

        const updated = await db.extractedComponent.update({
          where: { id: component.id },
          data: {
            generatedCode: stripMarkdownFences(response),
            codeFormat,
          },
        });
        updatedComponents.push(updated);
      } catch (err) {
        console.error(`Generate failed for ${component.id} (${component.name}):`, err);
        genErrors++;
      }
    }

    if (genErrors === componentsWithSpecs.length) {
      await db.project.update({
        where: { id },
        data: { status: 'failed', error: 'All component generations failed.' },
      });
      return NextResponse.json({ error: 'All component generations failed.' }, { status: 500 });
    }

    // Set status based on actual results
    const hasAnyCode = updatedComponents.length > 0;
    await db.project.update({
      where: { id },
      data: { status: hasAnyCode ? 'completed' : 'specced' },
    });

    return NextResponse.json({ components: updatedComponents });
  } catch (error) {
    console.error('Failed to generate code:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}
