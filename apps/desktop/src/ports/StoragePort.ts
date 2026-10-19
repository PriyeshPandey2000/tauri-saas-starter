/**
 * Non-secret local key/value storage (cached data, preferences). Secrets must use
 * the OS keychain wrapper instead.
 */
export interface StoragePort {
  /** Read a value, or `null` when the key is absent. */
  get<T>(key: string): Promise<T | null>;
  /** Write a value; replaces any existing value for the key. */
  set<T>(key: string, value: T): Promise<void>;
  /** Remove one key; missing keys are ignored. */
  remove(key: string): Promise<void>;
  /** Remove every value owned by this app. */
  clear(): Promise<void>;
}
