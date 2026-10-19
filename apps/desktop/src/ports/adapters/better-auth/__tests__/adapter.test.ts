import { describe, expect, it, vi } from "vitest";

import {
  AUTH_KEYS,
  createBetterAuthAdapter,
  type SecureStore,
} from "../adapter";

function memoryStore(seed: Record<string, string> = {}): SecureStore {
  const values = new Map(Object.entries(seed));
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

describe("better auth adapter", () => {
  it("dedupes concurrent refreshes into one token call", async () => {
    const tokenCalls = vi.fn(
      async () =>
        new Response(JSON.stringify({ token: "access-token" }), {
          status: 200,
        }),
    );
    const store = memoryStore({ [AUTH_KEYS.sessionToken]: "session-token" });
    const adapter = createBetterAuthAdapter({
      getApiUrl: () => "http://localhost:8787",
      store,
      fetchImpl: tokenCalls as unknown as typeof fetch,
    });

    await Promise.all([adapter.refresh(), adapter.refresh()]);

    expect(tokenCalls).toHaveBeenCalledTimes(1);
    await expect(store.get(AUTH_KEYS.accessToken)).resolves.toBe(
      "access-token",
    );
  });

  it("rejects a deep link whose state does not match", async () => {
    const openExternal = vi.fn(async () => undefined);
    const adapter = createBetterAuthAdapter({
      getApiUrl: () => "http://localhost:8787",
      store: memoryStore(),
      openExternal,
      fetchImpl: (async () =>
        new Response(JSON.stringify({}), {
          status: 200,
        })) as unknown as typeof fetch,
    });

    await adapter.signInWithOAuth("google");
    await expect(
      adapter.completeOAuthCallback(
        "tauri-saas-starter://auth/callback?code=abc&state=wrong",
      ),
    ).rejects.toMatchObject({ code: "state_mismatch" });
  });
});

describe("getSession failures", () => {
  const user = JSON.stringify({
    id: "u1",
    email: "ada@example.com",
    name: "Ada",
    emailVerified: true,
  });
  const seeded = () =>
    memoryStore({
      [AUTH_KEYS.sessionToken]: "session-token",
      [AUTH_KEYS.user]: user,
      [AUTH_KEYS.sessionExpiresAt]: "2026-11-01T00:00:00.000Z",
    });

  it("keeps the session on a 5xx and returns the cached user", async () => {
    const adapter = createBetterAuthAdapter({
      getApiUrl: () => "http://localhost:8787",
      store: seeded(),
      fetchImpl: (async () =>
        new Response(null, { status: 503 })) as unknown as typeof fetch,
    });
    const session = await adapter.getSession();
    expect(session?.user.email).toBe("ada@example.com");
  });

  it("keeps the session when the network fails", async () => {
    const store = seeded();
    const adapter = createBetterAuthAdapter({
      getApiUrl: () => "http://localhost:8787",
      store,
      fetchImpl: (async () => {
        throw new TypeError("offline");
      }) as unknown as typeof fetch,
    });
    const session = await adapter.getSession();
    expect(session?.user.email).toBe("ada@example.com");
    await expect(store.get(AUTH_KEYS.sessionToken)).resolves.toBe(
      "session-token",
    );
  });

  it("clears the session only on 401", async () => {
    const store = seeded();
    const adapter = createBetterAuthAdapter({
      getApiUrl: () => "http://localhost:8787",
      store,
      fetchImpl: (async () =>
        new Response(null, { status: 401 })) as unknown as typeof fetch,
    });
    await expect(adapter.getSession()).resolves.toBeNull();
    await expect(store.get(AUTH_KEYS.sessionToken)).resolves.toBeNull();
  });
});

describe("oauth callback consumption", () => {
  it("keeps the pending flow after a bogus link, then accepts the matching one", async () => {
    const opened: string[] = [];
    const exchangeCalls: RequestInit[] = [];
    const adapter = createBetterAuthAdapter({
      getApiUrl: () => "http://localhost:8787",
      store: memoryStore(),
      openExternal: async (url) => {
        opened.push(url);
      },
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        exchangeCalls.push(init ?? {});
        return new Response(JSON.stringify({ error: "invalid_pkce" }), {
          status: 400,
        });
      }) as unknown as typeof fetch,
    });

    await adapter.signInWithOAuth("google");
    const state = new URL(opened[0] ?? "").searchParams.get("state");
    expect(state).toBeTruthy();

    await expect(
      adapter.completeOAuthCallback(
        "tauri-saas-starter://auth/callback?code=abc&state=bogus",
      ),
    ).rejects.toMatchObject({ code: "state_mismatch" });
    expect(exchangeCalls).toHaveLength(0);

    await expect(
      adapter.completeOAuthCallback(
        `tauri-saas-starter://auth/callback?code=abc&state=${state}`,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(exchangeCalls).toHaveLength(1);
  });
});
