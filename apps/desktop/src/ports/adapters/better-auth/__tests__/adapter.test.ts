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
