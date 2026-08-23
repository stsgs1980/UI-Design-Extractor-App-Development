import { z } from "zod";

export const createProjectSchema = z.object({
  url: z.string().min(1, "URL is required").url("Invalid URL format"),
  name: z.string().max(200).optional(),
  componentQuery: z.string().max(500).optional(),
  viewport: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const pipelineSchema = z.object({
  codeFormat: z.enum(["HTML", "REACT", "VUE"]).optional(),
});

export type PipelineInput = z.infer<typeof pipelineSchema>;

export const generateSchema = z.object({
  codeFormat: z.enum(["HTML", "REACT", "VUE"]).optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;

export const saveReferenceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  componentId: z.string().optional(),
  html: z.string().min(1, "HTML is required"),
  css: z.string().optional(),
  spec: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type SaveReferenceInput = z.infer<typeof saveReferenceSchema>;
