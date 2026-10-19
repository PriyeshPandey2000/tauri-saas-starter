import { describe, expect, it } from "vitest";

import { createRateLimiter } from "../rate-limit";

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
});
