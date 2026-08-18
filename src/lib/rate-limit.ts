interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10;

let sweepTimer: ReturnType<typeof setInterval> | null = null;

function sweep() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * Simple in-memory rate limiter.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
 */
export function rateLimit(
  key: string,
  opts?: { windowMs?: number; maxRequests?: number },
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  if (!sweepTimer) {
    sweepTimer = setInterval(sweep, 30_000);
  }

  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = opts?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

/**
 * Rate limit middleware for Next.js API routes.
 * Uses client IP from x-forwarded-for or fallback to 'global'.
 */
export function checkRateLimit(
  request: Request,
  opts?: { windowMs?: number; maxRequests?: number },
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'global';
  return rateLimit(ip, opts);
}
