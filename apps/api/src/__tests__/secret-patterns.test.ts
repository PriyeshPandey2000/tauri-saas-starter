import { describe, expect, it } from "vitest";

import { findSecretHits } from "../../../../scripts/secret-patterns.mjs";

describe("secret patterns", () => {
  it("flags real key shapes", () => {
    const sample = (prefix: string, suffix: string) => `${prefix}_${suffix}`;
    const hits = findSecretHits([
      `VITE_POSTHOG_KEY=${sample("phc", "abcdefghijklmnopqrstuvwx")}`,
      `DODO_PAYMENTS_API_KEY=${sample("dodo", "abcdefghijklmnop")}`,
      `DODO_PAYMENTS_WEBHOOK_KEY=${sample("whsec", "abcdefghijklmnop")}`,
      `ENTITLEMENT_SIGNING_KEY=${"MIIEvQIBADANBgkqhkiG9w0BAQEFAASC" + "BKwggSjAgEAAoIBAQ"}`,
      `BETTER_AUTH_SECRET=${"abcdefghijklmnopqrstuvwxyz" + "012345"}`,
      `DATABASE_URL=${"postgres://app:" + "s3cr3tPassw0rd@db.example.com/app"}`,
      ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
      `SENTRY_AUTH_TOKEN=${sample("sntrys", "abcdefghijklmnop")}`,
      `SENTRY_DSN=${"https://" + "key@o1.ingest.sentry.io/1"}`,
    ]);
    expect(hits.length).toBe(9);
  });

  it("ignores placeholders and empty values", () => {
    const hits = findSecretHits([
      "VITE_POSTHOG_KEY=",
      "DODO_PAYMENTS_API_KEY=",
      "DODO_PAYMENTS_WEBHOOK_KEY=",
      "ENTITLEMENT_SIGNING_KEY=",
      "BETTER_AUTH_SECRET=",
      "BETTER_AUTH_SECRET=<openssl rand -base64 32>",
      "DATABASE_URL=postgres://user:password@localhost:5433/app",
      "DATABASE_URL_DIRECT=postgres://app:app@localhost:5433/app",
      'BETTER_AUTH_SECRET: "x".repeat(32),',
      "SENTRY_DSN=",
      "SENTRY_AUTH_TOKEN=",
    ]);
    expect(hits).toEqual([]);
  });
});
