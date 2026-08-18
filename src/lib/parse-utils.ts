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
 * Count bracket depth for a string, respecting strings and escapes.
 * Returns [openBraces, openBrackets, isInsideString].
 */
function bracketBalance(s: string): [number, number, boolean] {
  let ob = 0;
  let oc = 0;
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '[') ob++;
    if (ch === ']') ob--;
    if (ch === '{') oc++;
    if (ch === '}') oc--;
  }
  return [ob, oc, inStr];
}

/**
 * Attempt to repair malformed JSON from LLM output.
 *
 * Strategies applied in order:
 * 1. Normalize whitespace / control characters
 * 2. Remove trailing commas before } or ]
 * 3. Strip content after last valid `}` (LLM sometimes appends commentary)
 * 4. Fix unbalanced brackets by appending missing closers
 */
export function repairJson(text: string): string {
  // Step 1: normalize whitespace & strip control characters
  let fixed = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ');
  fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

  // Step 2: try parse as-is
  try { JSON.parse(fixed); return fixed; } catch { /* continue */ }

  // Step 3: remove trailing commas
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');
  try { JSON.parse(fixed); return fixed; } catch { /* continue */ }

  // Step 4: find the root object — scan from left, find the outermost {…}
  // This avoids iterating over every } in the string.
  let rootStart = -1;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < fixed.length; i++) {
    const ch = fixed[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') {
      if (depth === 0) rootStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && rootStart >= 0) {
        // Found the closing } of the root object
        let candidate = fixed.substring(rootStart, i + 1);
        const balance = bracketBalance(candidate);
        if (balance[2]) continue; // unclosed string
        // Fix missing brackets
        while (balance[1] > 0) { candidate += '}'; balance[1]--; }
        while (balance[0] > 0) { candidate += ']'; balance[0]--; }
        try {
          JSON.parse(candidate);
          return candidate;
        } catch { /* continue searching */ }
      }
    }
  }

  // Step 5: fallback — try substring at each } (brute force, limited to 10 attempts)
  let lastAttempt = fixed;
  let attempts = 0;
  let pos = fixed.length;
  while (pos > 0 && attempts < 10) {
    pos = fixed.lastIndexOf('}', pos - 1);
    if (pos < 0) break;
    attempts++;
    let candidate = fixed.substring(0, pos + 1);
    const balance = bracketBalance(candidate);
    if (balance[2]) continue;
    while (balance[1] > 0) { candidate += '}'; balance[1]--; }
    while (balance[0] > 0) { candidate += ']'; balance[0]--; }
    try {
      JSON.parse(candidate);
      lastAttempt = candidate;
      break;
    } catch { /* continue */ }
  }

  return lastAttempt;
}
