import type { StoragePort } from "../../StoragePort";

/** Storage adapter that keeps values in memory for the current run only. */
export function createMemoryStorage(): StoragePort {
  const entries = new Map<string, unknown>();

  return {
    get<T>(key: string): Promise<T | null> {
      return Promise.resolve(entries.has(key) ? (entries.get(key) as T) : null);
    },
    set<T>(key: string, value: T): Promise<void> {
      entries.set(key, value);
      return Promise.resolve();
    },
    remove(key: string): Promise<void> {
      entries.delete(key);
      return Promise.resolve();
    },
    clear(): Promise<void> {
      entries.clear();
      return Promise.resolve();
    },
  };
}
