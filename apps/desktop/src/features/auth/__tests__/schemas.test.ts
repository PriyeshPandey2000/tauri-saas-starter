import { describe, expect, it } from "vitest";

import {
  SessionSchema,
  SignInInputSchema,
  SignUpInputSchema,
} from "@app/shared";

describe("auth schemas", () => {
  it("rejects a password shorter than 10 characters", () => {
    expect(
      SignUpInputSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts valid sign-in and sign-up inputs", () => {
    expect(
      SignUpInputSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "long-enough-password",
      }).success,
    ).toBe(true);
    expect(
      SignInInputSchema.safeParse({
        email: "ada@example.com",
        password: "x",
      }).success,
    ).toBe(true);
  });

  it("validates a session payload", () => {
    expect(
      SessionSchema.safeParse({
        user: {
          id: "u1",
          email: "ada@example.com",
          name: "Ada",
          emailVerified: true,
        },
        expiresAt: "2026-11-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});
