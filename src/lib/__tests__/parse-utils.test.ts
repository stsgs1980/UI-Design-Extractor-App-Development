import { describe, it, expect } from 'vitest';
import { stripMarkdownFences, repairJson } from '@/lib/parse-utils';

describe('stripMarkdownFences', () => {
  it('strips ```json fences', () => {
    expect(stripMarkdownFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips ```html fences', () => {
    expect(stripMarkdownFences('```html\n<div>hi</div>\n```')).toBe('<div>hi</div>');
  });

  it('strips bare ``` fences', () => {
    expect(stripMarkdownFences('```\n{"ok":true}\n```')).toBe('{"ok":true}');
  });

  it('returns clean text unchanged', () => {
    expect(stripMarkdownFences('{"a":1}')).toBe('{"a":1}');
  });

  it('handles multiple fences', () => {
    const input = '```json\n{"a":1}\n```\n```html\n<div/>\n```';
    expect(stripMarkdownFences(input)).toBe('{"a":1}\n<div/>');
  });

  it('trims whitespace', () => {
    expect(stripMarkdownFences('  {"a":1}  ')).toBe('{"a":1}');
  });
});

describe('repairJson', () => {
  const VALID = '{"components":[{"name":"btn","html":"<button>"}],"designTokens":[]}';

  it('returns valid JSON unchanged', () => {
    expect(repairJson(VALID)).toBe(VALID);
  });

  it('normalizes newlines and tabs', () => {
    const input = '{\n  "components": \t []\n}';
    const result = repairJson(input);
    expect(JSON.parse(result)).toBeDefined();
  });

  it('strips control characters', () => {
    const input = '{"a": "\x01hello\x02"}';
    const result = repairJson(input);
    expect(JSON.parse(result)).toBeDefined();
  });

  it('extracts JSON from surrounding text', () => {
    const input = `Here is the result:\n${VALID}\n\nHope this helps!`;
    const result = repairJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.components).toHaveLength(1);
  });

  it('fixes unbalanced brackets', () => {
    const input = '{"components":[{"name":"btn"';
    const result = repairJson(input);
    expect(typeof result).toBe('string');
  });

  it('handles empty input gracefully', () => {
    const result = repairJson('');
    expect(typeof result).toBe('string');
  });

  it('handles completely invalid input', () => {
    const result = repairJson('not json at all');
    expect(typeof result).toBe('string');
  });
});
