import { describe, expect, it } from "vitest";

import { createRateLimiter, resolveClientKey } from "../rate-limit";

describe("desktop route rate limiter", () => {
  it("allows up to the limit inside a window", () => {
    let now = 0;
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 1000,
      now: () => now,
    });
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(false);
    now = 1001;
    expect(limiter.check("ip")).toBe(true);
  });

  it("keys on the socket address and ignores x-forwarded-for", () => {
    const first = resolveClientKey({
      headers: new Headers({ "x-forwarded-for": "1.2.3.4" }),
      socketAddress: "10.0.0.1",
    });
    const second = resolveClientKey({
      headers: new Headers({ "x-forwarded-for": "5.6.7.8" }),
      socketAddress: "10.0.0.1",
    });
    expect(first).toBe("10.0.0.1");
    expect(second).toBe(first);
  });

  it("keys on the trusted proxy header when configured", () => {
    expect(
      resolveClientKey({
        headers: new Headers({ "fly-client-ip": "9.9.9.9" }),
        trustedProxyHeader: "fly-client-ip",
        socketAddress: "10.0.0.1",
      }),
    ).toBe("9.9.9.9");
  });
});
