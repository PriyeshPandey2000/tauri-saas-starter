import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { verification } from "../db/schema";

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
  set(ott: string, challenge: string, ttlMs: number): Promise<void>;
  /** Consume the challenge for an OTT; returns null when missing or expired. */
  take(ott: string): Promise<string | null>;
}

/** Hash the OTT so the verification table never stores the bearer value. */
export function hashOneTimeToken(ott: string): string {
  return createHash("sha256").update(ott).digest("hex");
}

/**
 * `{ott -> challenge}` in the `verification` table, keyed by a hash of the OTT.
 * Single use; rows expire with the OTT.
 */
export function createChallengeStore(
  db: Database,
  now: () => number = Date.now,
): ChallengeStore {
  const identifier = (ott: string) => `desktop-pkce:${hashOneTimeToken(ott)}`;

  return {
    async set(ott, challenge, ttlMs) {
      const current = new Date(now());
      await db.insert(verification).values({
        id: randomUUID(),
        identifier: identifier(ott),
        value: challenge,
        expiresAt: new Date(current.getTime() + ttlMs),
        createdAt: current,
        updatedAt: current,
      });
    },
    async take(ott) {
      const [row] = await db
        .select({
          id: verification.id,
          value: verification.value,
          expiresAt: verification.expiresAt,
        })
        .from(verification)
        .where(eq(verification.identifier, identifier(ott)))
        .limit(1);
      if (!row) {
        return null;
      }
      await db.delete(verification).where(eq(verification.id, row.id));
      return new Date(row.expiresAt).getTime() > now() ? row.value : null;
    },
  };
}
