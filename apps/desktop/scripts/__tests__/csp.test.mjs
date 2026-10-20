import { describe, expect, it } from "vitest";

import { buildCsp } from "../csp.mjs";

describe("buildCsp", () => {
  it("allows only self and the API when PostHog is not configured", () => {
    const csp = buildCsp({ apiUrl: "https://api.example.com", isDev: false });
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).not.toContain("posthog.com");
  });

  it("adds the PostHog origin when a project key is set", () => {
    const csp = buildCsp({
      apiUrl: "https://api.example.com",
      posthogKey: "phc_test",
      posthogHost: "https://eu.i.posthog.com",
      isDev: false,
    });
    expect(csp).toContain("https://eu.i.posthog.com");
  });

  it("defaults the PostHog host to US cloud", () => {
    const csp = buildCsp({
      apiUrl: "https://api.example.com",
      posthogKey: "phc_test",
      isDev: false,
    });
    expect(csp).toContain("https://us.i.posthog.com");
  });

  it("adds the dev server origins only in dev", () => {
    const dev = buildCsp({ apiUrl: "https://api.example.com", isDev: true });
    const prod = buildCsp({ apiUrl: "https://api.example.com", isDev: false });
    expect(dev).toContain("http://localhost:1420");
    expect(dev).toContain("ws://localhost:1420");
    expect(prod).not.toContain("localhost:1420");
  });
});
