import { once } from "node:events";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";

import { serve } from "@hono/node-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AUTH_KEYS,
  createBetterAuthAdapter,
  type SecureStore,
} from "../../../../desktop/src/ports/adapters/better-auth/adapter";
import { createApp } from "../../app";
import { createAuth } from "../../auth/auth";
import { createTestDb } from "../../db/test-db";
import type { ApiEnv } from "../../env";

const baseEnv: ApiEnv = {
  NODE_ENV: "test",
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

/** Sign a user up through the desktop adapter and return their access JWT. */
async function signUpAndMint(baseUrl: string, email: string) {
  const store = memoryStore();
  const webviewFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("origin", "tauri://localhost");
    return fetch(input, { ...init, headers });
  };
  const adapter = createBetterAuthAdapter({
    getApiUrl: () => baseUrl,
    store,
    fetchImpl: webviewFetch,
  });
  const result = await adapter.signUp({
    name: email,
    email,
    password: "isolation-password-1",
  });
  if (result.status !== "authenticated") {
    throw new Error("expected an authenticated sign-up");
  }
  await adapter.refresh();
  const token = await store.get(AUTH_KEYS.accessToken);
  if (!token) {
    throw new Error("expected an access token");
  }
  return { token, userId: result.session.user.id };
}

describe("notes isolation (real Hono app + Postgres, webview Origin)", () => {
  let close: (() => void) | undefined;
  let baseUrl = "";
  let owner: { token: string; userId: string };
  let other: { token: string; userId: string };

  function call(
    path: string,
    init: { method?: string; token?: string; body?: unknown } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      origin: "tauri://localhost",
    };
    if (init.token) {
      headers.authorization = `Bearer ${init.token}`;
    }
    if (init.body !== undefined) {
      headers["content-type"] = "application/json";
    }
    return fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  }

  beforeAll(async () => {
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const env: ApiEnv = { ...baseEnv, BETTER_AUTH_URL: baseUrl };
    const { db } = await createTestDb();
    const auth = createAuth({
      db,
      env,
      mailer: { send: vi.fn(async () => undefined) },
    });
    const app = createApp({ auth, env, db });
    const server = serve({ fetch: app.fetch, port });
    close = () => server.close();
    await once(server, "listening");

    const stamp = Date.now();
    owner = await signUpAndMint(baseUrl, `owner-${stamp}@example.com`);
    other = await signUpAndMint(baseUrl, `other-${stamp}@example.com`);
  });

  afterAll(() => {
    close?.();
  });

  it("scopes every notes route to the JWT subject", async () => {
    const created = await call("/notes", {
      method: "POST",
      token: owner.token,
      body: { title: "Owner note", body: "private" },
    });
    expect(created.status).toBe(201);
    const { note } = (await created.json()) as { note: { id: string } };

    const ownerList = await call("/notes", { token: owner.token });
    expect(ownerList.status).toBe(200);
    await expect(ownerList.json()).resolves.toMatchObject({
      notes: [{ id: note.id, title: "Owner note" }],
    });

    const otherList = await call("/notes", { token: other.token });
    await expect(otherList.json()).resolves.toEqual({ notes: [] });

    const crossGet = await call(`/notes/${note.id}`, { token: other.token });
    expect(crossGet.status).toBe(404);

    const crossPatch = await call(`/notes/${note.id}`, {
      method: "PATCH",
      token: other.token,
      body: { title: "hijacked" },
    });
    expect(crossPatch.status).toBe(404);

    const crossDelete = await call(`/notes/${note.id}`, {
      method: "DELETE",
      token: other.token,
    });
    expect(crossDelete.status).toBe(404);

    const stillThere = await call(`/notes/${note.id}`, { token: owner.token });
    expect(stillThere.status).toBe(200);
    await expect(stillThere.json()).resolves.toMatchObject({
      note: { title: "Owner note" },
    });
  });

  it("rejects a request without a bearer token", async () => {
    const response = await call("/notes");
    expect(response.status).toBe(401);
  });

  it("rejects an invalid payload before touching the database", async () => {
    const response = await call("/notes", {
      method: "POST",
      token: owner.token,
      body: { title: "" },
    });
    expect(response.status).toBe(400);
  });
});
