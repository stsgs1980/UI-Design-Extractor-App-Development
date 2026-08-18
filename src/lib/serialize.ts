import type { Project, ExtractedComponent, DesignToken, Reference } from '@prisma/client';
import { STATUS_LABELS, TOKEN_CATEGORY_LABELS } from '@/types/extractor';

/** Prisma enum values are UPPERCASE; frontend expects lowercase. */
export function serializeStatus(status: string): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status.toLowerCase();
}

export function serializeTokenCategory(category: string): string {
  return TOKEN_CATEGORY_LABELS[category as keyof typeof TOKEN_CATEGORY_LABELS] ?? category.toLowerCase();
}

export function serializeViewport(viewport: string): string {
  return viewport.toLowerCase();
}

export function serializeCodeFormat(format: string): string {
  return format.toLowerCase();
}

export function serializeProject(p: Project & { _count?: { components: number; tokens: number } }) {
  return {
    ...p,
    status: serializeStatus(p.status),
    viewport: serializeViewport(p.viewport),
  };
}

export function serializeComponent(c: ExtractedComponent) {
  return {
    ...c,
    codeFormat: serializeCodeFormat(c.codeFormat),
  };
}

export function serializeToken(t: DesignToken) {
  return {
    ...t,
    category: serializeTokenCategory(t.category),
  };
}