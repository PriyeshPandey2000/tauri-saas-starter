import { isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

/** Raw on-disk shape; per-flag validation happens against the registry. */
export const CachedFlagsSchema = z.object({
  installId: z.string().uuid(),
  entries: z.record(z.string(), z.record(z.string(), z.unknown())),
});
export type CachedFlags = z.infer<typeof CachedFlagsSchema>;

export interface FlagCache {
  load(): Promise<CachedFlags>;
  save(value: CachedFlags): Promise<void>;
}

const FLAGS_FILE = "flags.json";
const FLAGS_KEY = "flags";
const memory = new Map<string, unknown>();

function fresh(): CachedFlags {
  return { installId: crypto.randomUUID(), entries: {} };
}

function parse(raw: unknown): CachedFlags {
  const parsed = CachedFlagsSchema.safeParse(raw);
  return parsed.success ? parsed.data : fresh();
}

/**
 * Per-install cache in `flags.json`. Entries are keyed by `user:<id>` or
 * `anon:<installId>`; the adapter only ever reads the current key.
 */
export function createPluginFlagCache(): FlagCache {
  let storePromise: Promise<
    import("@tauri-apps/plugin-store").Store | null
  > | null = null;

  const loadStore = () => {
    if (!storePromise) {
      storePromise = import("@tauri-apps/plugin-store")
        .then((mod) => mod.load(FLAGS_FILE, { autoSave: true }))
        .catch((error: unknown) => {
          console.warn("Failed to load the flag cache; using memory", error);
          return null;
        });
    }
    return storePromise;
  };

  return {
    async load() {
      if (!isTauri()) {
        return parse(memory.get(FLAGS_KEY));
      }
      const store = await loadStore();
      if (!store) {
        return parse(memory.get(FLAGS_KEY));
      }
      const raw = await store.get(FLAGS_KEY);
      const value = parse(raw);
      if (raw === undefined || raw === null) {
        await store.set(FLAGS_KEY, value);
      }
      return value;
    },
    async save(value) {
      if (!isTauri()) {
        memory.set(FLAGS_KEY, value);
        return;
      }
      const store = await loadStore();
      if (!store) {
        memory.set(FLAGS_KEY, value);
        return;
      }
      await store.set(FLAGS_KEY, value);
    },
  };
}

/** In-memory cache for tests. */
export function createMemoryFlagCache(seed?: Partial<CachedFlags>): FlagCache {
  let value: CachedFlags = { ...fresh(), ...seed };
  return {
    load: () => Promise.resolve(value),
    save: (next) => {
      value = next;
      return Promise.resolve();
    },
  };
}
