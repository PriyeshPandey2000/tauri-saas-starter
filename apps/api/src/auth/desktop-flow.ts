import { createHash, timingSafeEqual } from "node:crypto";

const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function isBase64Url(
  value: string,
  minLength: number,
  maxLength: number,
): boolean {
  return (
    value.length >= minLength &&
    value.length <= maxLength &&
    BASE64URL.test(value)
  );
}

/** S256 PKCE challenge: BASE64URL(SHA256(verifier)). */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export interface ChallengeStore {
  /** Remember the challenge for an OTT until it expires. */
  set(ott: string, challenge: string, ttlMs: number): void;
  /** Consume the challenge for an OTT; returns null when missing or expired. */
  take(ott: string): string | null;
  size(): number;
}

/** Single-process TTL store for `{ott -> challenge}` (see the design note). */
export function createChallengeStore(
  now: () => number = Date.now,
): ChallengeStore {
  const entries = new Map<string, { challenge: string; expiresAt: number }>();

  function dropExpired(): void {
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= current) {
        entries.delete(key);
      }
    }
  }

  return {
    set(ott, challenge, ttlMs) {
      dropExpired();
      entries.set(ott, { challenge, expiresAt: now() + ttlMs });
    },
    take(ott) {
      dropExpired();
      const entry = entries.get(ott);
      entries.delete(ott);
      return entry && entry.expiresAt > now() ? entry.challenge : null;
    },
    size() {
      dropExpired();
      return entries.size;
    },
  };
}
