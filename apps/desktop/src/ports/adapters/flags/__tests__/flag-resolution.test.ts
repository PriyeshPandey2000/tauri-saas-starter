import { describe, expect, it, vi } from "vitest";

import { DEFAULT_FLAGS } from "@app/shared";
import { createMemoryFlagCache, type FlagCache } from "../flag-cache";
import {
  createLocalOverrideAdapter,
  createMemoryOverrideStore,
} from "../local-override-adapter";
import { createPostHogFlagAdapter } from "../posthog-flag-adapter";

const ANON_ID = "11111111-1111-4111-8111-111111111111";

function remoteFetch(
  flags: Record<string, unknown>,
  calls: Record<string, unknown>[] = [],
) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({ flags, errorsWhileComputingFlags: false }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
}

function adapter(options: {
  cache?: FlagCache;
  fetchImpl?: typeof fetch;
  onWarning?: (message: string, context?: unknown) => void;
}) {
  return createPostHogFlagAdapter({
    apiKey: "phc_test",
    cache: options.cache ?? createMemoryFlagCache({ installId: ANON_ID }),
    fetchImpl: options.fetchImpl,
    timeoutMs: 100,
    refreshIntervalMs: 0,
    onWarning: options.onWarning,
  });
}

describe("flag resolution", () => {
  it("resolves override > remote > default", async () => {
    const fetchImpl = remoteFetch({
      newDashboard: { enabled: true },
      checkoutVariant: { enabled: true, variant: "b" },
    });
    const base = adapter({ fetchImpl });
    const flags = createLocalOverrideAdapter(
      base,
      createMemoryOverrideStore(),
      { allowOverrides: true },
    );

    await flags.init("user-a");
    await vi.waitFor(() => {
      expect(flags.getSource("newDashboard")).toBe("remote");
    });
    expect(flags.get("newDashboard")).toBe(true);
    expect(flags.get("checkoutVariant")).toBe("b");
    expect(flags.getSource("betaExport")).toBe("default");
    expect(flags.get("betaExport")).toBe(false);

    await flags.setOverride("newDashboard", false);
    expect(flags.get("newDashboard")).toBe(false);
    expect(flags.getSource("newDashboard")).toBe("override");

    await flags.clearOverride("newDashboard");
    expect(flags.get("newDashboard")).toBe(true);
    expect(flags.getSource("newDashboard")).toBe("remote");
  });

  it("falls back to the cached value, then registry defaults, when offline", async () => {
    const cache = createMemoryFlagCache({
      installId: ANON_ID,
      entries: { [`anon:${ANON_ID}`]: { betaExport: true, unknownFlag: true } },
    });
    const flags = adapter({
      cache,
      fetchImpl: vi.fn(async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    });

    await flags.init();
    expect(flags.get("betaExport")).toBe(true);
    expect(flags.getSource("betaExport")).toBe("remote");
    expect(flags.get("newDashboard")).toBe(DEFAULT_FLAGS.newDashboard);
    expect(flags.getSource("newDashboard")).toBe("default");
  });

  it("keeps per-user caches isolated and drops a user's cache on reset", async () => {
    const cache = createMemoryFlagCache({
      installId: ANON_ID,
      entries: {
        "user:a": { betaExport: true },
        "user:b": { newDashboard: true },
      },
    });
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const flags = adapter({ cache, fetchImpl });

    await flags.init("a");
    expect(flags.get("betaExport")).toBe(true);

    await flags.reset();
    expect(flags.get("betaExport")).toBe(false);

    await flags.init("b");
    expect(flags.get("newDashboard")).toBe(true);
    expect(flags.get("betaExport")).toBe(false);

    const saved = await cache.load();
    expect(saved.entries["user:a"]).toBeUndefined();
    expect(saved.entries["user:b"]).toEqual({ newDashboard: true });
  });
});

describe("consent and exposure", () => {
  it("identifies anonymously until consent, then once per flag per session", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        calls.push({ url: String(url), body });
        if (String(url).includes("/i/v0/e/")) {
          return new Response("{}", { status: 200 });
        }
        return new Response(
          JSON.stringify({
            flags: { newDashboard: { enabled: true } },
            errorsWhileComputingFlags: false,
          }),
          { status: 200 },
        );
      },
    ) as unknown as typeof fetch;
    const flags = adapter({ fetchImpl });

    await flags.init("user-a");
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]?.body.distinct_id).toBe(`anon:${ANON_ID}`);
    expect(calls[0]?.body.person_properties).toBeUndefined();

    flags.get("newDashboard");
    expect(calls.some((call) => call.url.includes("/i/v0/e/"))).toBe(false);

    flags.setConsent(true);
    await vi.waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.url.includes("/flags") && call.body.distinct_id === "user-a",
        ),
      ).toBe(true),
    );

    flags.get("newDashboard");
    flags.get("newDashboard");
    flags.get("betaExport");
    await vi.waitFor(() => {
      const exposures = calls.filter((call) => call.url.includes("/i/v0/e/"));
      expect(exposures).toHaveLength(2);
    });

    flags.setConsent(false);
    await vi.waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.url.includes("/flags") &&
            call.body.distinct_id === `anon:${ANON_ID}`,
        ),
      ).toBe(true),
    );
  });
});

describe("local overrides", () => {
  it("are impossible in production", async () => {
    const flags = createLocalOverrideAdapter(
      adapter({ fetchImpl: remoteFetch({ newDashboard: { enabled: true } }) }),
      createMemoryOverrideStore(),
      { allowOverrides: false, onWarning: () => undefined },
    );
    await flags.init("user-a");
    await vi.waitFor(() => expect(flags.get("newDashboard")).toBe(true));

    expect(flags.canOverride()).toBe(false);
    await flags.setOverride("newDashboard", false);
    expect(flags.get("newDashboard")).toBe(true);
    expect(flags.getSource("newDashboard")).toBe("remote");
  });
});
