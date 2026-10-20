import { listen } from "@tauri-apps/api/event";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

import { logger } from "@/ports";
import { APP_SCHEME } from "@/shared/lib/app-links";

export type DeepLinkHandler = (url: URL) => Promise<void> | void;

/** Only these host/path pairs are routable; everything else is ignored. */
export const ALLOWED_DEEP_LINKS = new Set(["auth/callback", "billing/success"]);

const handlers = new Map<string, DeepLinkHandler>();
const recent = new Map<string, number>();
const DEDUPE_MS = 2_000;

export function registerDeepLinkHandler(
  key: string,
  handler: DeepLinkHandler,
): void {
  if (!ALLOWED_DEEP_LINKS.has(key)) {
    throw new Error(`Deep link route is not allowlisted: ${key}`);
  }
  handlers.set(key, handler);
}

/** Parse and validate a URL; `null` for anything outside the allowlist. */
export function parseDeepLink(raw: string): { key: string; url: URL } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (
    url.protocol !== `${APP_SCHEME}:` ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    return null;
  }
  const key = `${url.hostname}${url.pathname.replace(/\/+$/, "")}`;
  if (!ALLOWED_DEEP_LINKS.has(key)) {
    return null;
  }
  return { key, url };
}

export async function routeDeepLink(raw: string): Promise<void> {
  const parsed = parseDeepLink(raw);
  if (!parsed) {
    logger.warn("Ignoring an unknown deep link");
    return;
  }
  const now = Date.now();
  for (const [key, at] of recent) {
    if (now - at >= DEDUPE_MS) {
      recent.delete(key);
    }
  }
  const last = recent.get(raw) ?? 0;
  if (now - last < DEDUPE_MS) {
    return;
  }
  recent.set(raw, now);
  const handler = handlers.get(parsed.key);
  if (!handler) {
    logger.warn("No handler registered for a deep link");
    return;
  }
  try {
    await handler(parsed.url);
  } catch (error) {
    logger.warn("Deep link handler failed", { error });
  }
}

/**
 * Listens for cold-start URLs, warm-start URLs and URLs forwarded by the
 * single-instance plugin. Returns a cleanup function.
 */
export function initializeDeepLinks(): () => void {
  let cancelled = false;
  const cleanups: (() => void)[] = [];

  const dispatch = (urls: string[] | null) => {
    for (const url of urls ?? []) {
      void routeDeepLink(url);
    }
  };

  void getCurrent()
    .then(dispatch)
    .catch(() => undefined);
  void onOpenUrl(dispatch)
    .then((stop) => {
      if (cancelled) {
        stop();
      } else {
        cleanups.push(stop);
      }
    })
    .catch((error: unknown) => {
      logger.warn("Could not listen for deep links", { error });
    });
  void listen<string>("native://deep-link", (event) => {
    void routeDeepLink(event.payload);
  })
    .then((stop) => {
      if (cancelled) {
        stop();
      } else {
        cleanups.push(stop);
      }
    })
    .catch((error: unknown) => {
      logger.warn("Could not listen for native deep links", { error });
    });

  return () => {
    cancelled = true;
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
