import { describe, expect, it, vi } from "vitest";

import { createPostHogAnalytics } from "../posthog-analytics";

function setup() {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return new Response("{}", { status: 200 });
    },
  ) as unknown as typeof fetch;
  const analytics = createPostHogAnalytics({
    apiKey: "phc_test",
    fetchImpl,
    onWarning: () => undefined,
  });
  return { analytics, calls };
}

describe("PostHog analytics", () => {
  it("sends nothing before consent", async () => {
    const { analytics, calls } = setup();
    await analytics.track("app_opened", {});
    await analytics.page("/notes");
    await analytics.identify("user-a");
    expect(calls).toHaveLength(0);
  });

  it("sends typed events after consent and stops on revoke", async () => {
    const { analytics, calls } = setup();
    analytics.setConsent(true);
    await analytics.identify("user-a");
    await analytics.track("sign_in", { method: "email" });
    await analytics.page("/notes");
    expect(calls.map((call) => call.body.event)).toEqual([
      "$identify",
      "sign_in",
      "$pageview",
    ]);
    expect(calls[1]?.body.distinct_id).toBe("user-a");

    analytics.setConsent(false);
    await analytics.track("sign_out", {});
    expect(calls).toHaveLength(3);
  });

  it("rejects properties that do not match the registry", async () => {
    const { analytics } = setup();
    analytics.setConsent(true);
    await expect(
      analytics.track("sign_in", { method: "carrier-pigeon" } as never),
    ).rejects.toThrow();
  });
});
