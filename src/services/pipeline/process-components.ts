import { sleep } from "@/lib/llm-retry";
import { log } from "./utils";
import type { PipelineLog, NamedItem } from "./types";

export interface ProcessComponentsResult {
  errorCount: number;
  total: number;
}

/**
 * Generic loop that iterates over components, calls `processOne` for each,
 * throttles between successful calls, catches errors, and tracks counts.
 *
 * The caller is responsible for:
 * - Pre-loop logging (e.g. "Generating specs for N components…")
 * - Per-component start/success logging inside `processOne`
 * - Post-loop summary logging using the returned counts
 *
 * Throttle is applied only after a **successful** `processOne` call
 * (mirrors original behaviour where empty LLM responses skip the sleep).
 */
export async function processComponents<T extends NamedItem>(params: {
  components: T[];
  logs: PipelineLog[];
  step: string;
  throttleMs?: number;
  processOne: (component: T, index: number, total: number) => Promise<void>;
}): Promise<ProcessComponentsResult> {
  const { components, logs, step, throttleMs = 2500, processOne } = params;
  let errorCount = 0;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    try {
      await processOne(component, i, components.length);
      // Throttle only after a successful call
      if (i < components.length - 1) {
        await sleep(throttleMs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const shortMsg = msg.length > 120 ? msg.substring(0, 120) + "..." : msg;
      log(logs, "error", step, `Failed: ${component.name} - ${shortMsg}`, component.name);
      errorCount++;
    }
  }

  return { errorCount, total: components.length };
}
