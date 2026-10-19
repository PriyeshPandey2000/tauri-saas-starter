import { describe, expect, it } from "vitest";

import { redactContext } from "../redact";

describe("redactContext", () => {
  it("redacts the named keys at the top level", () => {
    expect(
      redactContext({
        token: "abc",
        password: "pw",
        authorization: "Bearer x",
        secret: "s",
        user: "ada",
      }),
    ).toEqual({
      token: "[REDACTED]",
      password: "[REDACTED]",
      authorization: "[REDACTED]",
      secret: "[REDACTED]",
      user: "ada",
    });
  });

  it("matches key names case-insensitively and as fragments", () => {
    expect(
      redactContext({ accessToken: "a", clientSecret: "b", apiKey: "c" }),
    ).toEqual({
      accessToken: "[REDACTED]",
      clientSecret: "[REDACTED]",
      apiKey: "c",
    });
  });

  it("redacts nested objects and arrays", () => {
    expect(
      redactContext({
        request: {
          headers: [{ authorization: "Bearer x" }, { accept: "json" }],
        },
      }),
    ).toEqual({
      request: {
        headers: [{ authorization: "[REDACTED]" }, { accept: "json" }],
      },
    });
  });

  it("cuts cycles instead of throwing", () => {
    const value: Record<string, unknown> = { name: "a" };
    value.self = value;
    expect(redactContext(value)).toEqual({ name: "a", self: "[Circular]" });
  });

  it("keeps Error details and primitive values", () => {
    expect(redactContext(new Error("boom"))).toMatchObject({
      name: "Error",
      message: "boom",
    });
    expect(redactContext(42)).toBe(42);
    expect(redactContext(null)).toBeNull();
  });
});
