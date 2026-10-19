import { once } from "node:events";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";

import { serve } from "@hono/node-server";
import { createAuth } from "../auth/auth";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  AUTH_KEYS,
  createBetterAuthAdapter,
  type SecureStore,
} from "../../../desktop/src/ports/adapters/better-auth/adapter";

import { createApp } from "../app";
import { createTestDb } from "../db/test-db";
import type { ApiEnv } from "../env";

const env: ApiEnv = {
  PORT: 8787,
  DATABASE_URL: "postgres://user:pass@localhost:5432/app",
  DATABASE_URL_DIRECT: "postgres://user:pass@localhost:5432/app",
  DATABASE_POOL_MAX: 5,
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://127.0.0.1",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  APP_DEEP_LINK_SCHEME: "tauri-saas-starter",
  AUTH_REQUIRE_EMAIL_VERIFICATION: false,
};

function memoryStore(): SecureStore {
  const values = new Map<string, string>();
  return {
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      values.delete(key);
      return Promise.resolve();
    },
  };
}

async function freePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

describe("auth contract (real adapter + real Hono app + Postgres)", () => {
  let close: (() => void) | undefined;
  let baseUrl = "";
  let store: SecureStore;
  let adapter: ReturnType<typeof createBetterAuthAdapter>;
  const email = `contract-${Date.now()}@example.com`;
  const password = "contract-password-1";

  beforeAll(async () => {
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const contractEnv: ApiEnv = { ...env, BETTER_AUTH_URL: baseUrl };
    const { db } = await createTestDb();
    const auth = createAuth({
      db,
      env: contractEnv,
      mailer: { send: vi.fn(async () => undefined) },
    });
    const app = createApp({ auth, env: contractEnv, db });
    const server = serve({ fetch: app.fetch, port });
    close = () => server.close();
    await once(server, "listening");
    store = memoryStore();
    adapter = createBetterAuthAdapter({
      getApiUrl: () => baseUrl,
      store,
    });
  });

  afterAll(() => {
    close?.();
  });

  it("signs up, restores, refreshes, calls /api/me, then signs out", async () => {
    const signedUp = await adapter.signUp({
      name: "Contract User",
      email,
      password,
    });
    expect(signedUp.status).toBe("authenticated");
    if (signedUp.status !== "authenticated") {
      throw new Error("expected a session");
    }
    expect(signedUp.session.user.email).toBe(email);
    await expect(store.get(AUTH_KEYS.sessionToken)).resolves.toBeTruthy();

    const restored = await adapter.getSession();
    expect(restored?.user.email).toBe(email);

    await adapter.refresh();
    const accessToken = await store.get(AUTH_KEYS.accessToken);
    expect(accessToken).toBeTruthy();

    const me = await fetch(`${baseUrl}/api/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toEqual({
      userId: signedUp.session.user.id,
    });

    const signedIn = await adapter.signIn({ email, password });
    expect(signedIn.user.email).toBe(email);

    await adapter.signOut();
    await expect(store.get(AUTH_KEYS.sessionToken)).resolves.toBeNull();
    await expect(adapter.getSession()).resolves.toBeNull();
  });
});
