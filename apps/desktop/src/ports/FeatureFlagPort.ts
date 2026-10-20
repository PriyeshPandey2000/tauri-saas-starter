import type { FlagKey, FlagSource, FlagValue, FlagValues } from "@app/shared";

/**
 * Feature-flag boundary. `get` is synchronous: it reads an in-memory snapshot
 * that starts at registry defaults, then the per-user disk cache, then remote
 * values. Nothing here waits on the network.
 */
export interface FeatureFlagPort {
  /** Load the cache for the signed-in user (or the anonymous install) and refresh in the background. */
  init(userId?: string): Promise<void>;
  /** Current value of one flag. Never async, never blocks. */
  get<K extends FlagKey>(key: K): FlagValue<K>;
  /** Snapshot of every known flag. */
  getAll(): FlagValues;
  /** Where the current value came from (for the dev panel). */
  getSource(key: FlagKey): FlagSource;
  /** Fetch remote values in the background (no-op when remote is off). */
  refresh(): Promise<void>;
  /** Notify when any value or source changes. */
  subscribe(callback: () => void): () => void;
  /** Drop user state and switch back to the anonymous install. */
  reset(): Promise<void>;
  /** Consent gates identify and exposure events; evaluation itself never stops. */
  setConsent(granted: boolean): void;
  /** Local overrides are dev/staging only. */
  canOverride(): boolean;
  setOverride<K extends FlagKey>(key: K, value: FlagValue<K>): Promise<void>;
  clearOverride(key: FlagKey): Promise<void>;
  clearOverrides(): Promise<void>;
}
