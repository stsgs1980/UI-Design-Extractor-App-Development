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
 * Find the last unescaped `"` position in a string.
 */
function lastUnescapedQuote(s: string): number {
  let escaped = false;
  for (let i = s.length - 1; i >= 0; i--) {
    if (escaped) { escaped = false; continue; }
    if (s[i] === '\\') { escaped = true; continue; }
    if (s[i] === '"') return i;
  }
  return -1;
}

/**
 * Attempt to repair malformed JSON from LLM output.
 *
 * Strategies applied in order:
 * 1. Normalize whitespace / control characters
 * 2. Remove trailing commas before } or ]
 * 3. Strip content after last valid `}` (LLM sometimes appends commentary)
 * 4. Fix unbalanced brackets by appending missing closers
 * 5. Fix unterminated strings (LLM response truncated mid-string)
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
        let candidate = fixed.substring(rootStart, i + 1);
        const balance = bracketBalance(candidate);
        // If unterminated string, try to close it before the final }
        if (balance[2]) {
          candidate = closeUnterminatedString(candidate);
        }
        const finalBalance = bracketBalance(candidate);
        while (finalBalance[1] > 0) { candidate += '}'; finalBalance[1]--; }
        while (finalBalance[0] > 0) { candidate += ']'; finalBalance[0]--; }
        try {
          JSON.parse(candidate);
          return candidate;
        } catch { /* continue searching */ }
      }
    }
  }

  // Step 5: fallback — try substring at each } (brute force, limited to 20 attempts)
  let lastAttempt = fixed;
  let attempts = 0;
  let pos = fixed.length;
  while (pos > 0 && attempts < 20) {
    pos = fixed.lastIndexOf('}', pos - 1);
    if (pos < 0) break;
    attempts++;
    let candidate = fixed.substring(0, pos + 1);
    let balance = bracketBalance(candidate);

    // If unterminated string, try to close it
    if (balance[2]) {
      candidate = closeUnterminatedString(candidate);
      balance = bracketBalance(candidate);
    }

    if (balance[2]) continue; // still broken after fix attempt

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

/**
 * Attempt to close an unterminated JSON string.
 * Inserts a `"` before the last `}` in the string.
 */
function closeUnterminatedString(json: string): string {
  const lastBrace = json.lastIndexOf('}');
  if (lastBrace < 0) return json;

  // Insert a closing quote right before the last }
  return json.substring(0, lastBrace) + '"' + json.substring(lastBrace);
}
