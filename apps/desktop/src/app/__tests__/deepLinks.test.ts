import { describe, expect, it, vi } from "vitest";

vi.mock("@/ports", () => ({ logger: { warn: vi.fn() } }));

const { parseDeepLink, registerDeepLinkHandler, routeDeepLink } =
  await import("../deepLinks");

describe("deep link router", () => {
  it("accepts only the allowlisted scheme, host and path", () => {
    expect(
      parseDeepLink("tauri-saas-starter://auth/callback?code=1")?.key,
    ).toBe("auth/callback");
    expect(parseDeepLink("tauri-saas-starter://billing/success")?.key).toBe(
      "billing/success",
    );
    expect(parseDeepLink("tauri-saas-starter://auth/evil")).toBeNull();
    expect(parseDeepLink("https://auth/callback")).toBeNull();
    expect(
      parseDeepLink("tauri-saas-starter://user:pass@auth/callback"),
    ).toBeNull();
    expect(parseDeepLink("tauri-saas-starter://auth/callback:8443")).toBeNull();
    expect(
      parseDeepLink("tauri-saas-starter://other/auth/callback"),
    ).toBeNull();
  });

  it("ignores unknown links and dispatches known ones", async () => {
    const handler = vi.fn(async () => undefined);
    registerDeepLinkHandler("billing/success", handler);
    await routeDeepLink("tauri-saas-starter://billing/unknown");
    expect(handler).not.toHaveBeenCalled();
    await routeDeepLink("tauri-saas-starter://billing/success");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects registering a route outside the allowlist", () => {
    expect(() => registerDeepLinkHandler("admin/run", () => undefined)).toThrow(
      /not allowlisted/,
    );
  });
});
