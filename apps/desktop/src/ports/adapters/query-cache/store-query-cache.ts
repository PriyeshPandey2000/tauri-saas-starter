import { isTauri } from "@tauri-apps/api/core";
import type { Store } from "@tauri-apps/plugin-store";

import type { QueryCachePort } from "../../QueryCachePort";

const CACHE_FILE = "query-cache.json";
const CACHE_KEY = "query-cache";
const memory = new Map<string, string>();
let storePromise: Promise<Store | null> | null = null;

function loadStore(): Promise<Store | null> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store")
      .then((mod) => mod.load(CACHE_FILE, { autoSave: true }))
      .catch((error: unknown) => {
        console.warn("Falling back to memory query cache", error);
        return null;
      });
  }
  return storePromise;
}

async function resolveStore(): Promise<Store | null> {
  if (!isTauri()) {
    return null;
  }
  return loadStore();
}

/**
 * Query cache persisted through plugin-store (rule 2: vendor SDK in an adapter
 * only). Outside Tauri it degrades to in-memory, which is enough for tests.
 */
export const storeQueryCache: QueryCachePort = {
  async load() {
    const store = await resolveStore();
    if (!store) {
      return memory.get(CACHE_KEY) ?? null;
    }
    const value = await store.get(CACHE_KEY);
    return typeof value === "string" ? value : null;
  },
  async save(serialized) {
    const store = await resolveStore();
    if (!store) {
      memory.set(CACHE_KEY, serialized);
      return;
    }
    await store.set(CACHE_KEY, serialized);
  },
  async clear() {
    const store = await resolveStore();
    if (!store) {
      memory.delete(CACHE_KEY);
      return;
    }
    await store.delete(CACHE_KEY);
  },
};
