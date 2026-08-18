import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, checkRateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests under the limit', () => {
    expect(rateLimit('test-key', { windowMs: 1000, maxRequests: 3 }).allowed).toBe(true);
    expect(rateLimit('test-key', { windowMs: 1000, maxRequests: 3 }).allowed).toBe(true);
    expect(rateLimit('test-key', { windowMs: 1000, maxRequests: 3 }).allowed).toBe(true);
  });

  it('blocks requests over the limit', () => {
    rateLimit('test-key2', { windowMs: 1000, maxRequests: 2 });
    rateLimit('test-key2', { windowMs: 1000, maxRequests: 2 });
    const result = rateLimit('test-key2', { windowMs: 1000, maxRequests: 2 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it('resets after window expires', () => {
    rateLimit('test-key3', { windowMs: 1000, maxRequests: 1 });
    expect(rateLimit('test-key3', { windowMs: 1000, maxRequests: 1 }).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit('test-key3', { windowMs: 1000, maxRequests: 1 }).allowed).toBe(true);
  });

  it('isolates different keys', () => {
    rateLimit('a', { windowMs: 1000, maxRequests: 1 });
    expect(rateLimit('a', { windowMs: 1000, maxRequests: 1 }).allowed).toBe(false);
    expect(rateLimit('b', { windowMs: 1000, maxRequests: 1 }).allowed).toBe(true);
  });
});

describe('checkRateLimit', () => {
  it('uses x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    const result = checkRateLimit(req, { windowMs: 1000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
  });

  it('falls back to global when no header', () => {
    const req = new Request('http://localhost');
    const result = checkRateLimit(req, { windowMs: 1000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
  });
});
