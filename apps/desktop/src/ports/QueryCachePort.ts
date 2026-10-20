/**
 * Durable storage for the TanStack Query cache. Values are already-serialized
 * cache blobs; the port does not inspect them.
 */
export interface QueryCachePort {
  load(): Promise<string | null>;
  save(serialized: string): Promise<void>;
  clear(): Promise<void>;
}
