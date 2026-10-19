import { isTauri } from "@tauri-apps/api/core";
import type { StateStorage } from "zustand/middleware";

type TauriStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
};

const SETTINGS_FILE = "settings.json";
const memory = new Map<string, string>();
let storePromise: Promise<TauriStore | null> | null = null;

function loadTauriStore(): Promise<TauriStore | null> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store")
      .then((mod) => mod.load(SETTINGS_FILE, { autoSave: true }))
      .then((store) => store as unknown as TauriStore)
      .catch(() => null);
  }
  return storePromise;
}

async function resolveStore(): Promise<TauriStore | null> {
  if (!isTauri()) {
    return null;
  }
  return loadTauriStore();
}

export const settingsStorage: StateStorage = {
  getItem: async (name) => {
    const store = await resolveStore();
    if (!store) {
      return memory.get(name) ?? null;
    }
    const value = await store.get(name);
    return typeof value === "string" ? value : null;
  },
  setItem: async (name, value) => {
    const store = await resolveStore();
    if (!store) {
      memory.set(name, value);
      return;
    }
    await store.set(name, value);
  },
  removeItem: async (name) => {
    const store = await resolveStore();
    if (!store) {
      memory.delete(name);
      return;
    }
    await store.delete(name);
  },
};
