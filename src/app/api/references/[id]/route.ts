import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { stripMarkdownFences } from '@/lib/parse-utils';
import { GENERATE_SYSTEM_PROMPT } from '@/lib/prompts';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const reference = await db.reference.findUnique({ where: { id } });
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    await db.reference.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reference:', error);
    return NextResponse.json({ error: 'Failed to delete reference' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const codeFormat = body.codeFormat || 'html';

    const reference = await db.reference.findUnique({ where: { id } });
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    if (!reference.spec) {
      return NextResponse.json({ error: 'This reference has no spec to regenerate from' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const formatInstructions: Record<string, string> = {
      html: 'Generate clean, standalone HTML with embedded CSS in a <style> tag. Use semantic HTML. The code should be self-contained and work by itself in a browser.',
      react: 'Generate a clean React component (JSX). Use TypeScript. Include a default export. Use inline styles or a style object. Do not use external CSS files.',
      vue: 'Generate a clean Vue 3 SFC (Single File Component) using <template>, <script setup lang="ts">, and <style scoped> tags.',
    };

    const userPrompt = `Regenerate a ${codeFormat.toUpperCase()} component based on this saved specification:

Component name: ${reference.name}
${reference.description ? `Description: ${reference.description}` : ''}

Specification:
${reference.spec}

${reference.html ? `Original HTML reference:\n${reference.html}` : ''}

${formatInstructions[codeFormat] || formatInstructions.html}

Generate ONLY the code, nothing else. No explanations, no markdown fences.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: GENERATE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return NextResponse.json({ error: 'Empty LLM response' }, { status: 500 });
    }

    const generatedCode = stripMarkdownFences(response);

    const updated = await db.reference.update({
      where: { id },
      data: { html: generatedCode },
    });

    return NextResponse.json({ reference: updated, generatedCode });
  } catch (error) {
    console.error('Failed to regenerate reference:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate reference' },
      { status: 500 },
    );
  }
}
