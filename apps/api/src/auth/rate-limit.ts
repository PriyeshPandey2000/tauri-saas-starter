export interface RateLimiter {
  /** Returns true when the request is allowed. */
  check(key: string): boolean;
}

/** Tiny fixed-window limiter for the desktop OAuth routes. */
export function createRateLimiter(options: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = options.now ?? Date.now;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const current = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= current) {
        buckets.set(key, { count: 1, resetAt: current + options.windowMs });
        return true;
      }
      if (bucket.count >= options.max) {
        return false;
      }
      bucket.count += 1;
      return true;
    },
  };
}
