import { isTauri } from "@tauri-apps/api/core";
import type { Store } from "@tauri-apps/plugin-store";
import {
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
} from "zustand/middleware";

import type { AppSettings } from "@app/shared";

const SETTINGS_FILE = "settings.json";
const memory = new Map<string, string>();
let storePromise: Promise<Store | null> | null = null;

function loadTauriStore(): Promise<Store | null> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store")
      .then((mod) => mod.load(SETTINGS_FILE, { autoSave: true }))
      .catch(() => null);
  }
  return storePromise;
}

async function resolveStore(): Promise<Store | null> {
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

const jsonStorage = createJSONStorage<AppSettings>(() => settingsStorage);

export const settingsPersistStorage: PersistStorage<AppSettings> = {
  getItem: async (name) => {
    try {
      return await jsonStorage.getItem(name);
    } catch (error) {
      console.warn("Discarding unreadable stored settings", error);
      return null;
    }
  },
  setItem: (name, value) => jsonStorage.setItem(name, value),
  removeItem: (name) => jsonStorage.removeItem(name),
};
