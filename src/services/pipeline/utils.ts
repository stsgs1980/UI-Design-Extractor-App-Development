import type { PipelineLog } from "./types";

// - Logging -------------------------------

export function log(
  logs: PipelineLog[],
  level: PipelineLog["level"],
  step: string,
  message: string,
  component?: string,
): void {
  const entry: PipelineLog = { ts: new Date().toISOString(), level, step, message, component };
  logs.push(entry);
  const prefix = `[Pipeline][${step}]`;
  if (level === "error") console.error(prefix, message);
  else if (level === "warn") console.warn(prefix, message);
  else console.log(prefix, message);
}

// - Markdown fence removal ------------------------

export function stripMarkdownFences(text: string): string {
  return text
    .replace(/```json\n?/g, "")
    .replace(/```(?:html|react|vue|jsx|tsx)?\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

// - JSON repair -----------------------------

export function repairJson(text: string): string {
  let fixed = text.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\t/g, " ");
  fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

  // Attempt 1: parse as-is
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    /* continue */
  }

  // Attempt 2: remove trailing commas
  fixed = fixed.replace(/,\s*([\]}])/g, "$1");
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    /* continue */
  }

  // Attempt 3: binary-search for the longest valid prefix
  let lastAttempt = fixed;
  let pos = fixed.length;

  while (pos > 0) {
    pos = fixed.lastIndexOf("}", pos - 1);
    if (pos < 0) break;

    let candidate = fixed.substring(0, pos + 1);
    let ob = 0;
    let oc = 0;
    let inStr = false;
    let escaped = false;

    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === "[") ob++;
      if (ch === "]") ob--;
      if (ch === "{") oc++;
      if (ch === "}") oc--;
    }

    if (inStr) candidate += '"';
    while (oc > 0) {
      candidate += "}";
      oc--;
    }
    while (ob > 0) {
      candidate += "]";
      ob--;
    }

    try {
      const parsed = JSON.parse(candidate);
      lastAttempt = candidate;
      if (parsed.components || parsed.designTokens) return candidate;
    } catch {
      /* keep searching */
    }
  }

  return lastAttempt;
}
