import { describe, expect, it } from "vitest";

import {
  constantTimeEqual,
  createChallengeStore,
  isBase64Url,
  pkceChallenge,
} from "../desktop-flow";

describe("PKCE helpers", () => {
  it("computes the S256 challenge", () => {
    // SHA-256("abc") base64url, used as a stable vector.
    expect(pkceChallenge("abc")).toBe(
      "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0",
    );
  });

  it("compares values in constant time", () => {
    expect(constantTimeEqual("same", "same")).toBe(true);
    expect(constantTimeEqual("same", "diff")).toBe(false);
    expect(constantTimeEqual("short", "longer")).toBe(false);
  });

  it("validates base64url bounds", () => {
    expect(isBase64Url("abc_-", 4, 10)).toBe(true);
    expect(isBase64Url("abc+/", 4, 10)).toBe(false);
    expect(isBase64Url("abc", 4, 10)).toBe(false);
    expect(isBase64Url("abcdef", 2, 4)).toBe(false);
  });
});

describe("challenge store", () => {
  it("returns the challenge once", () => {
    const store = createChallengeStore();
    store.set("ott", "challenge", 1000);
    expect(store.take("ott")).toBe("challenge");
    expect(store.take("ott")).toBeNull();
  });

  it("drops expired entries", () => {
    let now = 0;
    const store = createChallengeStore(() => now);
    store.set("ott", "challenge", 1000);
    now = 1000;
    expect(store.take("ott")).toBeNull();
    expect(store.size()).toBe(0);
  });
});
