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

/**
 * Rate-limit bucket key. Only a header named in `TRUSTED_PROXY_HEADER` is
 * honoured; `x-forwarded-for` is ignored because any client can set it.
 *
 * When `TRUSTED_PROXY_HEADER` is unset, the socket address is used. When the
 * runtime cannot deterministically identify a client IP at all, Better Auth falls
 * back to one shared per-path bucket; configure `advanced.ipAddress.ipAddressHeaders`
 * (and/or `trustedProxies`) in front of production proxies so each client keeps its
 * own bucket.
 */
export function resolveClientKey(options: {
  headers: Headers;
  trustedProxyHeader?: string | undefined;
  socketAddress?: string | undefined;
}): string {
  const trusted = options.trustedProxyHeader;
  if (trusted) {
    return options.headers.get(trusted)?.trim() || "unknown";
  }
  return options.socketAddress ?? "local";
}
