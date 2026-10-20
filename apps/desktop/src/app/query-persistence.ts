import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";

import { ports } from "@/ports";

/** Query keys that must never be written to disk (auth material). */
const SENSITIVE_KEYS = ["auth", "me", "session", "token"];

function isSensitive(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === "string" && SENSITIVE_KEYS.includes(root);
}

/** Persist the query cache, minus auth-sensitive entries, on a debounce. */
export function persistQueryCache(queryClient: QueryClient): () => void {
  let timer: number | undefined;
  return queryClient.getQueryCache().subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => !isSensitive(query.queryKey),
      });
      void ports.queryCache
        .save(JSON.stringify(state))
        .catch((error: unknown) => {
          console.warn("Failed to persist the query cache", error);
        });
    }, 1_000);
  });
}

/** Restore a previously persisted cache. Safe to call once, at boot. */
export async function restoreQueryCache(
  queryClient: QueryClient,
): Promise<void> {
  try {
    const raw = await ports.queryCache.load();
    if (!raw) {
      return;
    }
    hydrate(queryClient, JSON.parse(raw));
  } catch (error) {
    console.warn("Discarding unreadable query cache", error);
    await ports.queryCache.clear();
  }
}

/** Drop the persisted cache (on sign-out). */
export async function clearQueryCache(): Promise<void> {
  await ports.queryCache.clear();
}
