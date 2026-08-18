import { z } from 'zod';

/**
 * Zod validation schemas for API routes.
 *
 * Frontend sends lowercase enum values; API routes map them to
 * UPPERCASE Prisma values using the TO_* maps from @/types/extractor.
 */

// ---------- Shared helpers ----------

const ALLOWED_PROTOCOLS = ['https:', 'http:'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/** Public HTTP(S) URL — blocks internal / private addresses (SSRF protection) */
const publicUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .refine((val) => {
    try {
      const url = new URL(val);
      if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return false;
      const host = url.hostname.toLowerCase();
      if (BLOCKED_HOSTS.includes(host)) return false;
      if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) return false;
      return true;
    } catch {
      return false;
    }
  }, 'URL must be a valid public HTTP(S) address');

const urlSchema = z.string().url('Must be a valid URL');

// ---------- 1. POST /api/projects ----------

export const createProjectSchema = z.object({
  url: publicUrlSchema,
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
