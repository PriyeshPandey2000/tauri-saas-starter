import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../app";
import { createChallengeStore, pkceChallenge } from "../desktop-flow";
import { createTestDb, resetTestDb } from "../../db/test-db";
import type { ApiEnv } from "../../env";
import {
  clampSessionExpiry,
  createAuth,
  shouldBlockImplicitLink,
  THIRTY_DAYS_MS,
} from "../auth";

const env: ApiEnv = {
  NODE_ENV: "test",
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

const shared = await createTestDb();

beforeEach(() => resetTestDb(shared.client));
afterAll(async () => {
  await shared.client.close();
});

async function setup() {
  const { db, client } = shared;
  const auth = createAuth({
    db,
    env,
    mailer: { send: vi.fn(async () => undefined) },
  });
  const challenges = createChallengeStore(db);
  const app = createApp({ auth, env, db, challenges });
  return { auth, app, challenges, client };
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
    const { auth } = await setup();
    const created = await signUp(auth);
    expect(created.user.email).toBe("ada@example.com");

    const signedIn = await auth.api.signInEmail({
      body: { email: "ada@example.com", password: "correct-horse-battery" },
    });
    expect(signedIn.user.email).toBe("ada@example.com");
    expect(signedIn.token).toBeTruthy();
  });

  it("rejects an untrusted origin on sign-in with a cookie", async () => {
    const { app } = await setup();
    const response = await app.fetch(
      new Request("http://localhost:8787/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "better-auth.session_token=stale",
          origin: "https://evil.example",
        },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "wrong-password",
        }),
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_ORIGIN",
    });
  });

  it("accepts the webview origin on sign-in with a cookie", async () => {
    const { auth, app } = await setup();
    await signUp(auth);
    const response = await app.fetch(
      new Request("http://localhost:8787/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "better-auth.session_token=stale",
          origin: "tauri://localhost",
        },
        body: JSON.stringify({
          email: "ada@example.com",
          password: "correct-horse-battery",
        }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rate limits repeated sign-in attempts", async () => {
    const { app } = await setup();
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
    const { auth, app, challenges } = await setup();
    const created = await signUp(auth);
    const ott = await auth.api.generateOneTimeToken({
      headers: new Headers({ authorization: `Bearer ${created.token}` }),
    });
    await challenges.set(ott.token, pkceChallenge("a".repeat(43)), 60_000);

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

  it("rejects token minting after the 30-day absolute cap", async () => {
    const { auth, app, client } = await setup();
    const created = await signUp(auth);
    await client.query(
      "UPDATE session SET created_at = now() - interval '31 days' WHERE token = $1",
      [created.token],
    );

    const mint = await app.fetch(
      new Request("http://localhost:8787/api/auth/token", {
        headers: { authorization: `Bearer ${created.token}` },
      }),
    );
    expect(mint.status).toBe(401);

    const read = await app.fetch(
      new Request("http://localhost:8787/api/auth/get-session", {
        headers: { authorization: `Bearer ${created.token}` },
      }),
    );
    expect(read.status).toBe(401);
  });

  it("rejects an expired challenge", async () => {
    const { app, challenges } = await setup();
    await challenges.set("expired-ott", pkceChallenge("c".repeat(43)), -1);
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

describe("challenge store", () => {
  it("lets only one of two concurrent takes win", async () => {
    const { challenges } = await setup();
    await challenges.set("race-ott", pkceChallenge("d".repeat(43)), 60_000);
    const [first, second] = await Promise.all([
      challenges.take("race-ott"),
      challenges.take("race-ott"),
    ]);
    const successes = [first, second].filter((value) => value !== null);
    expect(successes).toHaveLength(1);
  });
});
