import { describe, expect, it } from "vitest";

import {
  constantTimeEqual,
  hashOneTimeToken,
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

describe("challenge storage", () => {
  it("keys challenges by a hash of the OTT", () => {
    expect(hashOneTimeToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
