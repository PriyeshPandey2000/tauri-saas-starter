import { isTauri } from "@tauri-apps/api/core";
import {
  FLAG_KEYS,
  parseFlagValue,
  type FlagKey,
  type FlagValue,
  type FlagValues,
} from "@app/shared";

import type { FeatureFlagPort } from "../../FeatureFlagPort";

const SETTINGS_FILE = "settings.json";
const OVERRIDES_KEY = "flagOverrides";
const memory = new Map<string, unknown>();

/** Persisted local overrides; namespaced in the app settings file. */
export interface FlagOverrideStore {
  load(): Promise<Record<string, unknown>>;
  save(value: Record<string, unknown>): Promise<void>;
}

export function createPluginFlagOverrideStore(): FlagOverrideStore {
  let storePromise: Promise<
    import("@tauri-apps/plugin-store").Store | null
  > | null = null;

  const loadStore = () => {
    if (!storePromise) {
      storePromise = import("@tauri-apps/plugin-store")
        .then((mod) => mod.load(SETTINGS_FILE, { autoSave: true }))
        .catch((error: unknown) => {
          console.warn("Failed to load flag overrides; using memory", error);
          return null;
        });
    }
    return storePromise;
  };

  return {
    async load() {
      if (!isTauri()) {
        const value = memory.get(OVERRIDES_KEY);
        return value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};
      }
      const store = await loadStore();
      const value = await store?.get(OVERRIDES_KEY);
      return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
    },
    async save(value) {
      if (!isTauri()) {
        memory.set(OVERRIDES_KEY, value);
        return;
      }
      const store = await loadStore();
      if (store) {
        await store.set(OVERRIDES_KEY, value);
      } else {
        memory.set(OVERRIDES_KEY, value);
      }
    },
  };
}

export function createMemoryOverrideStore(): FlagOverrideStore {
  let value: Record<string, unknown> = {};
  return {
    load: () => Promise.resolve({ ...value }),
    save: (next) => {
      value = { ...next };
      return Promise.resolve();
    },
  };
}

export interface LocalOverrideOptions {
  allowOverrides: boolean;
  onWarning?: (message: string, context?: unknown) => void;
}

/**
 * Decorator: local overrides win over remote and defaults, but only when the
 * app is not production. Values are validated against the registry.
 */
export function createLocalOverrideAdapter(
  base: FeatureFlagPort,
  store: FlagOverrideStore,
  options: LocalOverrideOptions,
): FeatureFlagPort {
  const warn =
    options.onWarning ??
    ((message: string, context?: unknown) => console.warn(message, context));
  const listeners = new Set<() => void>();
  let overrides: Partial<FlagValues> = {};
  let unsubscribeBase: (() => void) | null = null;

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function hasOverride(key: FlagKey): boolean {
    return Object.hasOwn(overrides, key);
  }

  function sanitize(raw: Record<string, unknown>): Partial<FlagValues> {
    const clean: Partial<FlagValues> = {};
    for (const key of FLAG_KEYS) {
      const parsed = parseFlagValue(key, raw[key]);
      if (parsed !== null) {
        (clean as Record<FlagKey, unknown>)[key] = parsed;
      }
    }
    return clean;
  }

  return {
    async init(userId) {
      unsubscribeBase?.();
      unsubscribeBase = base.subscribe(notify);
      overrides = sanitize(await store.load());
      await base.init(userId);
      notify();
    },

    get<K extends FlagKey>(key: K): FlagValue<K> {
      const override = overrides[key];
      return override !== undefined
        ? (override as FlagValue<K>)
        : base.get(key);
    },

    getAll() {
      return { ...base.getAll(), ...overrides } as FlagValues;
    },

    getSource(key) {
      return hasOverride(key) ? "override" : base.getSource(key);
    },

    refresh: () => base.refresh(),

    subscribe(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    reset: async () => {
      await base.reset();
      notify();
    },

    setConsent: (granted) => base.setConsent(granted),
    canOverride: () => options.allowOverrides,

    async setOverride(key, value) {
      if (!options.allowOverrides) {
        warn("Local flag overrides are disabled in production", { key });
        return;
      }
      const parsed = parseFlagValue(key, value);
      if (parsed === null) {
        throw new Error(`Invalid value for flag ${key}`);
      }
      overrides = { ...overrides, [key]: parsed } as Partial<FlagValues>;
      await store.save(overrides);
      notify();
    },

    async clearOverride(key) {
      if (!hasOverride(key)) {
        return;
      }
      const next = { ...overrides };
      delete next[key];
      overrides = next;
      await store.save(overrides);
      notify();
    },

    async clearOverrides() {
      overrides = {};
      await store.save({});
      notify();
    },
  };
}
