/**
 * Strip markdown code fences from LLM responses.
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```(?:html|react|vue|jsx|tsx)?\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * Attempt to repair malformed JSON from LLM output.
 * Strategies applied in order:
 * 1. Normalize whitespace / control characters
 * 2. Remove trailing commas before } or ]
 * 3. Find the last complete JSON object by bracket balancing
 */
export function repairJson(text: string): string {
  // Normalize whitespace & strip control characters
  let fixed = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ');
  fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

  // Try parse as-is
  try { JSON.parse(fixed); return fixed; } catch { /* continue */ }

  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');
  try { JSON.parse(fixed); return fixed; } catch { /* continue */ }

  // Find last complete JSON by bracket balancing
  let lastAttempt = fixed;
  let pos = fixed.length;

  while (pos > 0) {
    pos = fixed.lastIndexOf('}', pos - 1);
    if (pos < 0) break;

    const candidate = fixed.substring(0, pos + 1);
    let ob = 0;
    let oc = 0;
    let inStr = false;
    let escaped = false;

    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '[') ob++;
      if (ch === ']') ob--;
      if (ch === '{') oc++;
      if (ch === '}') oc--;
    }

    if (inStr) { /* unclosed string - skip */ continue; }
    while (oc > 0) { candidate += '}'; oc--; }
    while (ob > 0) { candidate += ']'; ob--; }

    try {
      const parsed = JSON.parse(candidate);
      lastAttempt = candidate;
      if (parsed.components || parsed.designTokens) return candidate;
    } catch { /* continue */ }
  }

  return lastAttempt;
}
