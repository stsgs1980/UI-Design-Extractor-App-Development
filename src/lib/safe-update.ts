import { db } from '@/lib/db';
import type { ProjectStatus } from '@prisma/client';

/**
 * Safely update project status — silently ignores P2025 (record not found).
 * This prevents cascading errors when a project is deleted mid-pipeline.
 */
export async function safeUpdateProjectStatus(
  id: string,
  status: ProjectStatus,
  error?: string,
): Promise<void> {
  try {
    await db.project.update({
      where: { id },
      data: { status, ...(error ? { error } : {}) },
    });
    console.log(`[safe-update] project ${id} -> ${status}`);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      console.warn(`[safe-update] project ${id} not found (already deleted), skipping status update`);
      return;
    }
    throw err;
  }
}

/** Project statuses that indicate an active pipeline is running */
export const PROCESSING_STATUSES: ProjectStatus[] = [
  'EXTRACTING',
  'ANALYZING',
  'SPECCING',
  'GENERATING',
];
