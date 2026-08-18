import { z } from 'zod';

/**
 * Zod validation schemas for API routes.
 *
 * Frontend sends lowercase enum values; API routes map them to
 * UPPERCASE Prisma values using the TO_* maps from @/types/extractor.
 */

// ---------- Shared helpers ----------

const urlSchema = z.string().url('Must be a valid URL');

// ---------- 1. POST /api/projects ----------

export const createProjectSchema = z.object({
  url: urlSchema,
  name: z.string().optional(),
  componentQuery: z.string().optional(),
  viewport: z
    .enum(['desktop', 'mobile', 'tablet'])
    .default('desktop'),
});

// ---------- 2. POST /api/projects/[id]/pipeline ----------

export const pipelineRequestSchema = z.object({
  codeFormat: z
    .enum(['html', 'react', 'vue'])
    .default('html'),
});

// ---------- 3. POST /api/references ----------

export const saveReferenceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sourceUrl: urlSchema.optional(),
  componentId: z.string().optional(),
  html: z.string().min(1, 'HTML content is required'),
  css: z.string().optional(),
  spec: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
