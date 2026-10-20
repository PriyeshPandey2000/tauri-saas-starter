import { describe, expect, it } from "vitest";

import { scrubSentryEvent, scrubText, scrubValue } from "../scrub";

describe("scrubText", () => {
  it("removes emails, tokens, query strings and home paths", () => {
    const text = scrubText(
      "ada@example.com Bearer abc123 token=secret https://x.test/cb?code=1 /Users/ada/app C:\\Users\\ada\\app",
    );
    expect(text).not.toContain("ada@example.com");
    expect(text).not.toContain("abc123");
    expect(text).not.toContain("code=1");
    expect(text).toContain("/Users/[user]");
    expect(text).toContain("C:\\Users\\[user]");
  });

  it("keeps harmless text intact", () => {
    expect(scrubText("notes list rendered")).toBe("notes list rendered");
  });
});

describe("scrubValue", () => {
  it("filters sensitive keys recursively and keeps safe values", () => {
    const clean = scrubValue({
      email: "ada@example.com",
      installId: "abc",
      nested: { accessToken: "t", title: "hello" },
      list: ["ada@example.com", 3],
    }) as Record<string, unknown>;
    expect(clean.email).toBe("[Filtered]");
    expect(clean.installId).toBe("[Filtered]");
    expect((clean.nested as Record<string, unknown>).accessToken).toBe(
      "[Filtered]",
    );
    expect((clean.nested as Record<string, unknown>).title).toBe("hello");
    expect(clean.list).toEqual(["[email]", 3]);
  });
});

describe("scrubSentryEvent", () => {
  it("drops request bodies, headers, user email and breadcrumb data", () => {
    const clean = scrubSentryEvent({
      message: "failed for ada@example.com",
      server_name: "macbook",
      user: {
        id: "user-1",
        email: "ada@example.com",
        username: "ada",
        ip_address: "1.2.3.4",
      },
      request: {
        method: "POST",
        url: "https://api.test/x?token=abc",
        headers: { authorization: "Bearer abc" },
        cookies: "session=abc",
        data: { password: "hunter2" },
      },
      breadcrumbs: [
        {
          message: "GET /api?code=1",
          data: { cookie: "session=abc", path: "/Users/ada/x" },
        },
      ],
      extra: { token: "abc", note: "fine" },
      contexts: { device: { username: "ada" } },
      tags: { email: "ada@example.com", release: "1.0.0" },
      exception: { values: [{ value: "Bearer abc for ada@example.com" }] },
    });

    expect(clean.server_name).toBeUndefined();
    expect(clean.user).toEqual({ id: "user-1" });
    expect(clean.request).toEqual({
      method: "POST",
      url: "https://api.test/x?[Filtered]",
    });
    expect(JSON.stringify(clean)).not.toContain("ada@example.com");
    expect(JSON.stringify(clean)).not.toContain("hunter2");
    expect(JSON.stringify(clean)).not.toContain("session=abc");
    expect(JSON.stringify(clean)).not.toContain("abc123");
    expect((clean.extra as Record<string, unknown>).token).toBe("[Filtered]");
    expect((clean.extra as Record<string, unknown>).note).toBe("fine");
    const breadcrumb = (clean.breadcrumbs as Record<string, unknown>[])[0];
    expect((breadcrumb?.data as Record<string, unknown>).cookie).toBe(
      "[Filtered]",
    );
    expect((breadcrumb?.data as Record<string, unknown>).path).toBe(
      "/Users/[user]/x",
    );
  });
});
