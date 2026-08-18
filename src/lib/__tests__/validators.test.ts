import { describe, it, expect } from 'vitest';
import { createProjectSchema } from '@/lib/validators';

describe('createProjectSchema SSRF protection', () => {
  it('rejects localhost', () => {
    const result = createProjectSchema.safeParse({ url: 'http://localhost:3000' });
    expect(result.success).toBe(false);
  });

  it('rejects 127.0.0.1', () => {
    const result = createProjectSchema.safeParse({ url: 'http://127.0.0.1' });
    expect(result.success).toBe(false);
  });

  it('rejects 0.0.0.0', () => {
    const result = createProjectSchema.safeParse({ url: 'http://0.0.0.0' });
    expect(result.success).toBe(false);
  });

  it('rejects 192.168.x.x', () => {
    const result = createProjectSchema.safeParse({ url: 'http://192.168.1.1' });
    expect(result.success).toBe(false);
  });

  it('rejects 10.x.x.x', () => {
    const result = createProjectSchema.safeParse({ url: 'http://10.0.0.1' });
    expect(result.success).toBe(false);
  });

  it('rejects file:// protocol', () => {
    const result = createProjectSchema.safeParse({ url: 'file:///etc/passwd' });
    expect(result.success).toBe(false);
  });

  it('allows https://example.com', () => {
    const result = createProjectSchema.safeParse({ url: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('allows http://example.com', () => {
    const result = createProjectSchema.safeParse({ url: 'http://example.com' });
    expect(result.success).toBe(true);
  });
});
