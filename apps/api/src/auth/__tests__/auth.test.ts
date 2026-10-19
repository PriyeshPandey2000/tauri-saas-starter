import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app";
import { createChallengeStore, pkceChallenge } from "../desktop-flow";
import type { ApiEnv } from "../../env";
import {
  clampSessionExpiry,
  createAuth,
  shouldBlockImplicitLink,
  THIRTY_DAYS_MS,
} from "../auth";

const env: ApiEnv = {
  PORT: 8787,
  DATABASE_URL: "postgres://user:pass@localhost:5432/app",
  DATABASE_URL_DIRECT: "postgres://user:pass@localhost:5432/app",
  DATABASE_POOL_MAX: 5,
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:8787",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  APP_DEEP_LINK_SCHEME: "tauri-saas-starter",
  AUTH_REQUIRE_EMAIL_VERIFICATION: false,
};

function setup() {
  const auth = createAuth({
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
      jwks: [],
    }),
    env,
    mailer: { send: vi.fn(async () => undefined) },
  });
  const challenges = createChallengeStore();
  const app = createApp({ auth, env, challenges });
  return { auth, app, challenges };
}

async function signUp(auth: ReturnType<typeof createAuth>) {
  return auth.api.signUpEmail({
    body: {
      name: "Ada",
      email: "ada@example.com",
      password: "correct-horse-battery",
    },
  });
}

describe("auth API", () => {
  it("signs up and signs in with email and password", async () => {
    const { auth } = setup();
    const created = await signUp(auth);
    expect(created.user.email).toBe("ada@example.com");

    const signedIn = await auth.api.signInEmail({
      body: { email: "ada@example.com", password: "correct-horse-battery" },
    });
    expect(signedIn.user.email).toBe("ada@example.com");
    expect(signedIn.token).toBeTruthy();
  });

  it("rate limits repeated sign-in attempts", async () => {
    const { app } = setup();
    let lastStatus = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await app.fetch(
        new Request("http://localhost:8787/api/auth/sign-in/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "nobody@example.com",
            password: "wrong-password",
          }),
        }),
      );
      lastStatus = response.status;
      if (lastStatus === 429) {
        break;
      }
    }
    expect(lastStatus).toBe(429);
  });

  it("rejects a wrong PKCE verifier and consumes the challenge", async () => {
    const { auth, app, challenges } = setup();
    const created = await signUp(auth);
    const ott = await auth.api.generateOneTimeToken({
      headers: new Headers({ authorization: `Bearer ${created.token}` }),
    });
    challenges.set(ott.token, pkceChallenge("a".repeat(43)), 60_000);

    const wrong = await app.fetch(
      new Request("http://localhost:8787/auth/desktop/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ott.token, verifier: "b".repeat(43) }),
      }),
    );
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toEqual({ error: "invalid_pkce" });

    const replay = await app.fetch(
      new Request("http://localhost:8787/auth/desktop/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: ott.token,
          verifier: "a".repeat(43),
        }),
      }),
    );
    expect(replay.status).toBe(400);
  });

  it("rejects an expired challenge", async () => {
    const { app, challenges } = setup();
    challenges.set("expired-ott", pkceChallenge("c".repeat(43)), -1);
    const response = await app.fetch(
      new Request("http://localhost:8787/auth/desktop/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: "expired-ott",
          verifier: "c".repeat(43),
        }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("session and linking policy", () => {
  it("clamps the rolling expiry to 30 days from creation", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const rolling = new Date(createdAt.getTime() + THIRTY_DAYS_MS + 86_400_000);
    expect(clampSessionExpiry(createdAt, rolling).getTime()).toBe(
      createdAt.getTime() + THIRTY_DAYS_MS,
    );
    const inside = new Date(createdAt.getTime() + 86_400_000);
    expect(clampSessionExpiry(createdAt, inside)).toBe(inside);
  });

  it("blocks linking only for unverified credential users", () => {
    expect(
      shouldBlockImplicitLink({
        providerId: "google",
        emailVerified: false,
        hasCredentialAccount: true,
      }),
    ).toBe(true);
    expect(
      shouldBlockImplicitLink({
        providerId: "google",
        emailVerified: true,
        hasCredentialAccount: true,
      }),
    ).toBe(false);
    expect(
      shouldBlockImplicitLink({
        providerId: "google",
        emailVerified: false,
        hasCredentialAccount: false,
      }),
    ).toBe(false);
  });
});
