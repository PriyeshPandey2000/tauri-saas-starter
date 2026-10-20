import { z } from "zod";
import {
  DEFAULT_FLAGS,
  FLAG_KEYS,
  parseFlagValue,
  type FlagKey,
  type FlagSource,
  type FlagValue,
  type FlagValues,
} from "@app/shared";

import type { FeatureFlagPort } from "../../FeatureFlagPort";
import type { FlagCache } from "./flag-cache";

const DEFAULT_HOST = "https://us.i.posthog.com";
const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_REFRESH_MS = 5 * 60_000;

const FlagsResponseSchema = z.object({
  flags: z.record(
    z.string(),
    z.object({
      enabled: z.boolean().optional(),
      variant: z.string().nullable().optional(),
    }),
  ),
  errorsWhileComputingFlags: z.boolean().optional(),
});

export interface PostHogFlagAdapterOptions {
  apiKey: string;
  host?: string;
  cache: FlagCache;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  refreshIntervalMs?: number;
  /** Skip every PostHog request until consent is granted. */
  requireConsent?: boolean;
  onWarning?: (message: string, context?: unknown) => void;
}

type Listener = () => void;

/**
 * Resolves flags from PostHog's `/flags?v=2` endpoint without the JS SDK: the
 * desktop app only needs evaluation, and posthog-js is far larger than this.
 * Values start at registry defaults, then the per-user disk cache, then remote.
 */
export function createPostHogFlagAdapter(
  options: PostHogFlagAdapterOptions,
): FeatureFlagPort {
  const host = (options.host ?? DEFAULT_HOST).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const refreshMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_MS;
  const warn =
    options.onWarning ??
    ((message: string, context?: unknown) => console.warn(message, context));

  const listeners = new Set<Listener>();
  const exposed = new Set<FlagKey>();
  let values: FlagValues = { ...DEFAULT_FLAGS };
  let sources = defaultSources();
  let userId: string | null = null;
  let installId: string | null = null;
  let entries: Record<string, Record<string, unknown>> = {};
  let consent = false;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let initialized = false;
  let generation = 0;
  let warned = false;

  function defaultSources(): Record<FlagKey, FlagSource> {
    return Object.fromEntries(
      FLAG_KEYS.map((key) => [key, "default"]),
    ) as Record<FlagKey, FlagSource>;
  }

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function cacheKey(): string {
    return userId ? `user:${userId}` : `anon:${installId ?? "unknown"}`;
  }

  function distinctId(): string {
    return consent && userId ? userId : `anon:${installId ?? "unknown"}`;
  }

  function applyDefaults(): void {
    values = { ...DEFAULT_FLAGS };
    sources = defaultSources();
  }

  function applyCache(): void {
    applyDefaults();
    const entry = entries[cacheKey()] ?? {};
    for (const key of FLAG_KEYS) {
      const parsed = parseFlagValue(key, entry[key]);
      if (parsed !== null) {
        (values as Record<FlagKey, unknown>)[key] = parsed;
        sources[key] = "remote";
      }
    }
  }

  async function persist(): Promise<void> {
    if (!installId) {
      return;
    }
    await options.cache
      .save({ installId, entries })
      .catch((error: unknown) => warn("Could not save the flag cache", error));
  }

  function remoteValue<K extends FlagKey>(
    key: K,
    remote: { enabled?: boolean; variant?: string | null },
  ): FlagValue<K> | null {
    const raw =
      typeof DEFAULT_FLAGS[key] === "boolean"
        ? (remote.enabled ?? false)
        : (remote.variant ?? null);
    return parseFlagValue(key, raw);
  }

  async function refresh(): Promise<void> {
    if (!initialized || !installId) {
      return;
    }
    if (options.requireConsent && !consent) {
      return;
    }
    const requestedKey = cacheKey();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${host}/flags?v=2`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: options.apiKey,
          distinct_id: distinctId(),
          // Person properties stay off until consent; kill switches need only the id.
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Flag request failed with ${response.status}`);
      }
      const parsed = FlagsResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error("Flag response did not match the expected shape");
      }
      if (parsed.data.errorsWhileComputingFlags) {
        warn("PostHog could not compute some feature flags");
      }
      if (requestedKey !== cacheKey()) {
        return;
      }
      const nextValues: FlagValues = { ...values };
      const nextSources: Record<FlagKey, FlagSource> = { ...sources };
      const entry: Record<string, unknown> = {};
      for (const key of FLAG_KEYS) {
        const remote = parsed.data.flags[key];
        if (!remote) {
          continue;
        }
        const value = remoteValue(key, remote);
        if (value === null) {
          continue;
        }
        (nextValues as Record<FlagKey, unknown>)[key] = value;
        nextSources[key] = "remote";
        entry[key] = value;
      }
      entries = { ...entries, [requestedKey]: entry };
      const changed = JSON.stringify(nextValues) !== JSON.stringify(values);
      values = nextValues;
      sources = nextSources;
      if (changed) {
        notify();
      }
      await persist();
    } catch (error) {
      if (!warned) {
        warned = true;
        warn("Feature flags are using cached/default values", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      clearTimeout(timer);
    }
  }

  function captureExposure(key: FlagKey): void {
    if (!consent) {
      return;
    }
    fetchImpl(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: options.apiKey,
        event: "$feature_flag_called",
        distinct_id: distinctId(),
        properties: {
          $feature_flag: key,
          $feature_flag_response: String(values[key]),
        },
      }),
    }).catch(() => undefined);
  }

  const adapter: FeatureFlagPort = {
    async init(nextUserId) {
      const token = ++generation;
      userId = nextUserId ?? null;
      const cached = await options.cache.load();
      if (token !== generation) {
        return;
      }
      installId = cached.installId;
      entries = cached.entries;
      initialized = true;
      applyCache();
      notify();
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (refreshMs > 0) {
        refreshTimer = setInterval(() => void refresh(), refreshMs);
      }
      void refresh();
    },

    get<K extends FlagKey>(key: K): FlagValue<K> {
      if (consent && initialized && installId && !exposed.has(key)) {
        exposed.add(key);
        queueMicrotask(() => captureExposure(key));
      }
      return values[key];
    },

    getAll: () => ({ ...values }),
    getSource: (key) => sources[key],
    refresh,

    subscribe(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    async reset() {
      generation += 1;
      initialized = false;
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      const previousKey = cacheKey();
      if (previousKey.startsWith("user:")) {
        delete entries[previousKey];
        await persist();
      }
      userId = null;
      exposed.clear();
      applyDefaults();
      notify();
      await adapter.init(undefined);
    },

    setConsent(granted) {
      if (consent === granted) {
        return;
      }
      consent = granted;
      exposed.clear();
      // Re-evaluate as the identified user (granted) or the anonymous install.
      if (initialized) {
        void refresh();
      }
    },

    canOverride: () => false,
    setOverride: () => Promise.resolve(),
    clearOverride: () => Promise.resolve(),
    clearOverrides: () => Promise.resolve(),
  };

  return adapter;
}
