import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { FlagKey, FlagSource, FlagValue } from "@app/shared";

import { ports } from "@/ports";

const exposed = new Set<FlagKey>();

/** Re-render only when this flag's value changes (React bails out on equal snapshots). */
export function useFlag<K extends FlagKey>(key: K): FlagValue<K> {
  const subscribe = useCallback(
    (callback: () => void) => ports.featureFlags.subscribe(callback),
    [],
  );
  const getSnapshot = useCallback(() => ports.featureFlags.get(key), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (exposed.has(key)) {
      return;
    }
    exposed.add(key);
    void ports.analytics.track("flag_exposed", { flag: key, value });
  }, [key, value]);
  return value;
}

/** Where the current value came from; mostly for the dev panel. */
export function useFlagSource(key: FlagKey): FlagSource {
  const subscribe = useCallback(
    (callback: () => void) => ports.featureFlags.subscribe(callback),
    [],
  );
  const getSnapshot = useCallback(
    () => ports.featureFlags.getSource(key),
    [key],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
