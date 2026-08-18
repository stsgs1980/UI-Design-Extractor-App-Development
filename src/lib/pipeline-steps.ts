import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { ProjectStatus, CodeFormat, TokenCategory } from '@prisma/client';
import { stripMarkdownFences, repairJson } from '@/lib/parse-utils';
import {
  ANALYZE_SYSTEM_PROMPT,
  SPEC_SYSTEM_PROMPT,
  GENERATE_SYSTEM_PROMPT,
  buildAnalyzeUserPrompt,
  buildSpecUserPrompt,
  buildGenerateUserPrompt,
} from '@/lib/prompts';
import { TO_CODE_FORMAT } from '@/types/extractor';

/** Shared ZAI client type produced by `await ZAI.create()` */
export type ZaiClient = Awaited<ReturnType<typeof ZAI.create>>;

// ---------------------------------------------------------------------------
// Types for component data coming from LLM JSON
// ---------------------------------------------------------------------------

interface LlmComponent {
  name?: string;
  tag?: string | null;
  html?: string | null;
  cssClasses?: string | null;
  inlineStyles?: string | null;
}

interface LlmToken {
  category?: string | null;
  name?: string | null;
  value?: string | null;
  originalVar?: string | null;
}

/** Map lowercase LLM token category to Prisma enum */
const CATEGORY_MAP: Record<string, TokenCategory> = {
  color: 'COLOR',
  spacing: 'SPACING',
  typography: 'TYPOGRAPHY',
  'border-radius': 'BORDER_RADIUS',
  shadow: 'SHADOW',
  opacity: 'OPACITY',
};

// ---------------------------------------------------------------------------
// Step 1: Analyze
// ---------------------------------------------------------------------------

export async function runAnalyze(projectId: string, zai: ZaiClient, componentQuery: string | null) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !project.rawHtml) {
    throw new Error('No HTML data to analyze');
  }

  await db.project.update({ where: { id: projectId }, data: { status: 'ANALYZING' as ProjectStatus } });

  const userPrompt = buildAnalyzeUserPrompt(project.rawHtml, project.componentQuery || componentQuery);

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) throw new Error('Empty LLM response during analysis');

  const parsed = JSON.parse(repairJson(stripMarkdownFences(response)));

  const validComponents = (parsed.components || []).filter(
    (c: LlmComponent) =>
      c.name && c.html && typeof c.html === 'string' && c.html.trim().length > 0,
  );

  if (validComponents.length === 0) {
    throw new Error('No valid components found in the analysis. The page may be too simple or the LLM could not parse it.');
  }

  const validTokens = (parsed.designTokens || []).filter(
    (t: LlmToken) => t.name && t.value && t.category && CATEGORY_MAP[t.category],
  );

  // Atomic: delete old + create new in a single transaction
  const [createdComponents, createdTokens] = await db.$transaction(async (tx) => {
    await tx.extractedComponent.deleteMany({ where: { projectId } });
    await tx.designToken.deleteMany({ where: { projectId } });

    const comps = await Promise.all(
      validComponents.map((c: LlmComponent) =>
        tx.extractedComponent.create({
          data: {
            projectId,
            name: c.name!,
            tag: c.tag || null,
            html: c.html!,
            cssClasses: c.cssClasses || null,
            inlineStyles: c.inlineStyles || null,
          },
        }),
      ),
    );

    const tokens = await Promise.all(
      validTokens.map((t: LlmToken) =>
        tx.designToken.create({
          data: {
            projectId,
            category: CATEGORY_MAP[t.category!],
            name: t.name!,
            value: t.value!,
            originalVar: t.originalVar || null,
          },
        }),
      ),
    );

    return [comps, tokens] as const;
  });

  return { components: createdComponents, tokens: createdTokens };
}

// ---------------------------------------------------------------------------
// Step 2: Spec
// ---------------------------------------------------------------------------

export async function runSpec(projectId: string, zai: ZaiClient) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { components: true },
  });

  if (!project) throw new Error('Project not found');
  if (project.components.length === 0) throw new Error('No components to generate specs for');

  await db.project.update({ where: { id: projectId }, data: { status: 'SPECCING' as ProjectStatus } });

  const updatedComponents = [];

  for (const component of project.components) {
    const userPrompt = buildSpecUserPrompt(component);

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SPEC_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) continue;

    const cleaned = stripMarkdownFences(response);

    let specData: string;
    try {
      JSON.parse(cleaned);
      specData = cleaned;
    } catch {
      specData = JSON.stringify({
        name: component.name,
        description: cleaned,
        props: [],
        variants: [],
        accessibility: [],
        dependencies: [],
      });
    }

    const updated = await db.extractedComponent.update({
      where: { id: component.id },
      data: { spec: specData },
    });
    updatedComponents.push(updated);
  }

  return updatedComponents;
}

// ---------------------------------------------------------------------------
// Step 3: Generate
// ---------------------------------------------------------------------------

export async function runGenerate(projectId: string, zai: ZaiClient, codeFormat: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { components: true, tokens: true },
  });

  if (!project) throw new Error('Project not found');

  const componentsWithSpecs = project.components.filter((c) => c.spec);
  if (componentsWithSpecs.length === 0) throw new Error('No components with specs to generate code from');

  await db.project.update({ where: { id: projectId }, data: { status: 'GENERATING' as ProjectStatus } });

  const prismaCodeFormat = (TO_CODE_FORMAT[codeFormat] || 'HTML') as CodeFormat;

  const tokensContext = project.tokens.length > 0
    ? `\n\nDesign tokens available:\n${project.tokens.map((t) => `${t.name}: ${t.value} (${t.category})`).join('\n')}`
    : '';

  const updatedComponents = [];

  for (const component of componentsWithSpecs) {
    const userPrompt = buildGenerateUserPrompt({
      spec: component.spec!,
      html: component.html,
      codeFormat,
      tokensContext,
    });

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: GENERATE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) continue;

    const updated = await db.extractedComponent.update({
      where: { id: component.id },
      data: {
        generatedCode: stripMarkdownFences(response),
        codeFormat: prismaCodeFormat,
      },
    });
    updatedComponents.push(updated);
  }

  return updatedComponents;
}