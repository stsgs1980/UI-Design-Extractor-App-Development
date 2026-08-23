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
  console.log('[pipeline:analyze] start for project:', projectId);
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
  console.log('[pipeline:analyze] LLM response length:', response?.length);
  if (!response) throw new Error('Empty LLM response during analysis');

  const cleaned = stripMarkdownFences(response);
  const repaired = repairJson(cleaned);
  let parsed: any;
  try {
    parsed = JSON.parse(repaired);
  } catch (parseErr) {
    console.error('[pipeline:analyze] JSON parse failed after repair. Response length:', cleaned.length, 'Repaired length:', repaired.length);
    console.error('[pipeline:analyze] parse error:', parseErr instanceof Error ? parseErr.message : parseErr);
    // Log first 500 and last 200 chars of the repaired JSON for debugging
    console.error('[pipeline:analyze] repaired start:', repaired.substring(0, 500));
    console.error('[pipeline:analyze] repaired end:', repaired.substring(repaired.length - 200));
    throw new Error('LLM returned invalid JSON that could not be repaired. The page may be too complex.');
  }
  console.log('[pipeline:analyze] parsed components:', (parsed.components || []).length, 'tokens:', (parsed.designTokens || []).length);

  const validComponents = (parsed.components || []).filter(
    (c: LlmComponent) =>
      c.name && c.html && typeof c.html === 'string' && c.html.trim().length > 0,
  );

  if (validComponents.length === 0) {
    console.error('[pipeline:analyze] no valid components found');
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

  console.log('[pipeline:analyze] done, created', createdComponents.length, 'components,', createdTokens.length, 'tokens');
  return { components: createdComponents, tokens: createdTokens };
}

// ---------------------------------------------------------------------------
// Step 2: Spec
// ---------------------------------------------------------------------------

export async function runSpec(projectId: string, zai: ZaiClient) {
  console.log('[pipeline:spec] start for project:', projectId);
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { components: true },
  });

  if (!project) throw new Error('Project not found');
  if (project.components.length === 0) throw new Error('No components to generate specs for');

  await db.project.update({ where: { id: projectId }, data: { status: 'SPECCING' as ProjectStatus } });

  const updatedComponents = [];
  console.log('[pipeline:spec] processing', project.components.length, 'components');

  for (let i = 0; i < project.components.length; i++) {
    const component = project.components[i];
    console.log('[pipeline:spec]', i + 1, '/', project.components.length, component.name);

    const userPrompt = buildSpecUserPrompt(component);

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SPEC_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.warn('[pipeline:spec] empty response for', component.name);
      continue;
    }

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

  console.log('[pipeline:spec] done, updated', updatedComponents.length, 'components');
  return updatedComponents;
}

// ---------------------------------------------------------------------------
// Step 3: Generate
// ---------------------------------------------------------------------------

export async function runGenerate(projectId: string, zai: ZaiClient, codeFormat: string) {
  console.log('[pipeline:generate] start for project:', projectId, 'format:', codeFormat);
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { components: true, tokens: true },
  });

  if (!project) throw new Error('Project not found');

  const componentsWithSpecs = project.components.filter((c) => c.spec);
  if (componentsWithSpecs.length === 0) throw new Error('No components with specs to generate code from');

  await db.project.update({ where: { id: projectId }, data: { status: 'GENERATING' as ProjectStatus } });

  console.log('[pipeline:generate]', componentsWithSpecs.length, 'components to generate, tokens:', project.tokens.length);
  const prismaCodeFormat = (TO_CODE_FORMAT[codeFormat] || 'HTML') as CodeFormat;

  const tokensContext = project.tokens.length > 0
    ? `\n\nDesign tokens available:\n${project.tokens.map((t) => `${t.name}: ${t.value} (${t.category})`).join('\n')}`
    : '';

  const updatedComponents = [];

  for (let i = 0; i < componentsWithSpecs.length; i++) {
    const component = componentsWithSpecs[i];
    console.log('[pipeline:generate]', i + 1, '/', componentsWithSpecs.length, component.name);

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
    if (!response) {
      console.warn('[pipeline:generate] empty response for', component.name);
      continue;
    }

    const updated = await db.extractedComponent.update({
      where: { id: component.id },
      data: {
        generatedCode: stripMarkdownFences(response),
        codeFormat: prismaCodeFormat,
      },
    });
    updatedComponents.push(updated);
    console.log('[pipeline:generate] done:', component.name, '| code length:', stripMarkdownFences(response).length);
  }

  console.log('[pipeline:generate] completed, generated', updatedComponents.length, 'codes');
  return updatedComponents;
}
