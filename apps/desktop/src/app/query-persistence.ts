import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

import { ports } from "@/ports";

/**
 * Only these roots may be written to disk. This is an allowlist on purpose:
 * user data (notes) lives in the per-user SQLite file, and a denylist would
 * leak any new user-data query added later.
 */
const PERSISTABLE_QUERY_ROOTS = new Set(["preferences"]);

/** True when a query key may be persisted. Exported for tests. */
export function isPersistableQueryKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === "string" && PERSISTABLE_QUERY_ROOTS.has(root);
}

/** Persist the allowlisted query cache on a debounce. */
export function persistQueryCache(queryClient: QueryClient): () => void {
  let timer: number | undefined;
  return queryClient.getQueryCache().subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => isPersistableQueryKey(query.queryKey),
      });
      void ports.queryCache
        .save(JSON.stringify(state))
        .catch((error: unknown) => {
          console.warn("Failed to persist the query cache", error);
        });
    }, 1_000);
  });
}

/**
 * Restore a previously persisted cache. Safe to call once, at boot. Entries
 * outside the allowlist are dropped, including notes written by older builds.
 */
export async function restoreQueryCache(
  queryClient: QueryClient,
): Promise<void> {
  try {
    const raw = await ports.queryCache.load();
    if (!raw) {
      return;
    }
    const state = JSON.parse(raw) as DehydratedState;
    if (Array.isArray(state.queries)) {
      state.queries = state.queries.filter((query) =>
        isPersistableQueryKey(query.queryKey),
      );
    }
    hydrate(queryClient, state);
  } catch (error) {
    console.warn("Discarding unreadable query cache", error);
    await ports.queryCache.clear();
  }
}

/** Drop the persisted cache (on sign-out). */
export async function clearQueryCache(): Promise<void> {
  await ports.queryCache.clear();
}

/**
 * Clear the in-memory cache when the signed-in user changes. `subscribe`
 * delivers the current user id on every auth state change; the first value is
 * the baseline, so signing in does not clear a freshly booted client.
 */
export function clearQueryCacheOnUserChange(
  queryClient: QueryClient,
  subscribe: (listener: (userId: string | null) => void) => void,
): void {
  let previous: string | null = null;
  subscribe((userId) => {
    if (previous !== null && userId !== previous) {
      queryClient.clear();
    }
    previous = userId;
  });
}
