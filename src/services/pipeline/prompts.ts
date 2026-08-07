// - Analyze prompts ---------------------------

export const ANALYZE_SYSTEM_PROMPT = `You are a UI analysis expert. Extract components and design tokens from HTML.
You must respond with ONLY valid JSON, no markdown code blocks, no explanation.
Extract at most 8 most important/visible components. For each component, include only the essential outer HTML (keep under 500 characters).

CRITICAL: In the "html" field, replace all double quotes (\" ) with single quotes ('). This prevents JSON parsing errors.

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

export function buildAnalyzeUserPrompt(rawHtml: string, componentQuery: string | null): string {
  const focusInstruction = componentQuery
    ? `\n\nIMPORTANT: Focus ONLY on these component types: ${componentQuery}. Ignore other elements.`
    : "";

  return `Analyze the following HTML and extract all reusable UI components and design tokens.

Focus on:
1. Identifying distinct UI components (buttons, cards, navbars, forms, etc.)
2. Extracting design tokens (colors, spacing, typography, shadows, border-radius, opacity)
3. Capturing CSS custom properties from :root or style blocks
${focusInstruction}

HTML to analyze:
${rawHtml.substring(0, 30000)}`;
}

// - Spec prompts -----------------------------

export const SPEC_SYSTEM_PROMPT = `You are a UI component specification expert. Generate detailed specifications for UI components.
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

export function buildSpecUserPrompt(component: {
  name: string;
  tag: string | null;
  html: string;
  cssClasses: string | null;
  inlineStyles: string | null;
}): string {
  return `Generate a detailed specification for this UI component.

Component name: ${component.name}
HTML tag: ${component.tag || "N/A"}
HTML:
${component.html}
CSS classes: ${component.cssClasses || "N/A"}
Inline styles: ${component.inlineStyles || "N/A"}

Provide a comprehensive spec including props, variants, accessibility notes, and dependencies.`;
}

// - Generate prompts ---------------------------

export const GENERATE_SYSTEM_PROMPT = `You are a clean code generation expert. Generate standalone, reusable UI component code from specifications.
You must respond with ONLY the generated code, no markdown code blocks, no explanation, no commentary.`;

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  html: "Generate clean, standalone HTML with embedded CSS in a <style> tag. Use semantic HTML. The code should be self-contained and work by itself in a browser.",
  react:
    "Generate a clean React component (JSX). Use TypeScript. Include a default export. Use inline styles or a style object. Do not use external CSS files.",
  vue: 'Generate a clean Vue 3 SFC (Single File Component) using <template>, <script setup lang="ts">, and <style scoped> tags.',
};

export function buildGenerateUserPrompt(
  codeFormat: string,
  spec: string,
  html: string,
  tokensContext: string,
): string {
  const formatInstruction = FORMAT_INSTRUCTIONS[codeFormat] || FORMAT_INSTRUCTIONS.html;
  return `Generate a ${codeFormat.toUpperCase()} component based on this specification:

Component Specification:
${spec}

Original HTML reference:
${html}
${tokensContext}

${formatInstruction}

Generate ONLY the code, nothing else. No explanations, no markdown fences.`;
}
