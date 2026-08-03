import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

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

    // Update status to generating
    await db.project.update({
      where: { id },
      data: { status: 'generating' },
    });

    try {
      const zai = await ZAI.create();
      const updatedComponents = [];

      // Build design tokens context
      const tokensContext = project.tokens.length > 0
        ? `\n\nDesign tokens available:\n${project.tokens.map((t) => `${t.name}: ${t.value} (${t.category})`).join('\n')}`
        : '';

      for (const component of componentsWithSpecs) {
        const formatInstructions = {
          html: 'Generate clean, standalone HTML with embedded CSS in a <style> tag. Use semantic HTML. The code should be self-contained and work by itself in a browser.',
          react: 'Generate a clean React component (JSX). Use TypeScript. Include a default export. Use inline styles or a style object. Do not use external CSS files.',
          vue: 'Generate a clean Vue 3 SFC (Single File Component) using <template>, <script setup lang="ts">, and <style scoped> tags.',
        }[codeFormat];

        const USER_PROMPT = `Generate a ${codeFormat.toUpperCase()} component based on this specification:

Component Specification:
${component.spec}

Original HTML reference:
${component.html}
${tokensContext}

${formatInstructions}

Generate ONLY the code, nothing else. No explanations, no markdown fences.`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: SYSTEM_PROMPT },
            { role: 'user', content: USER_PROMPT },
          ],
          thinking: { type: 'disabled' },
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) continue;

        const cleanedCode = stripMarkdownFences(response);

        const updated = await db.extractedComponent.update({
          where: { id: component.id },
          data: {
            generatedCode: cleanedCode,
            codeFormat,
          },
        });
        updatedComponents.push(updated);
      }

      // Update project status
      await db.project.update({
        where: { id },
        data: { status: 'completed' },
      });

      return NextResponse.json({ components: updatedComponents });
    } catch (generateError) {
      await db.project.update({
        where: { id },
        data: {
          status: 'failed',
          error: generateError instanceof Error ? generateError.message : 'Code generation failed',
        },
      });
      return NextResponse.json(
        { error: generateError instanceof Error ? generateError.message : 'Code generation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to generate code:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}
