import { parseAnalyticsProperties, type AnalyticsEvent } from "@app/shared";

import type { AnalyticsPort } from "../../AnalyticsPort";

export interface PostHogAnalyticsOptions {
  apiKey: string;
  host?: string;
  fetchImpl?: typeof fetch;
  onWarning?: (message: string, context?: unknown) => void;
}

const DEFAULT_HOST = "https://us.i.posthog.com";
const TIMEOUT_MS = 5_000;

/**
 * PostHog over its REST ingest endpoint (same approach as flags; no SDK).
 * Autocapture is impossible here: only explicitly named events are sent.
 */
export function createPostHogAnalytics(
  options: PostHogAnalyticsOptions,
): AnalyticsPort {
  const host = (options.host ?? DEFAULT_HOST).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let consent = false;
  let userId: string | null = null;
  let anonymousId = crypto.randomUUID();

  async function send(
    event: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    if (!consent) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      await fetchImpl(`${host}/i/v0/e/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: options.apiKey,
          event,
          distinct_id: userId ?? anonymousId,
          properties,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      options.onWarning?.("Analytics event was not delivered", {
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async track(event: AnalyticsEvent, properties) {
      if (!consent) {
        return;
      }
      const parsed = parseAnalyticsProperties(event, properties);
      await send(event, parsed as Record<string, unknown>);
    },

    async page(path) {
      if (!consent) {
        return;
      }
      await send("$pageview", { $current_url: path });
    },

    async identify(nextUserId) {
      userId = nextUserId;
      if (!consent) {
        return;
      }
      await send("$identify", { $set: {} });
    },

    async reset() {
      userId = null;
      anonymousId = crypto.randomUUID();
    },

    setConsent(granted) {
      consent = granted;
      if (!granted) {
        userId = null;
        anonymousId = crypto.randomUUID();
      }
    },
  };
}
