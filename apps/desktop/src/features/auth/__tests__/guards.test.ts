import { describe, expect, it } from "vitest";

import { authedRedirect, guestRedirect } from "../guards";

describe("route guards", () => {
  it("sends unauthenticated users to sign-in with a redirect", () => {
    expect(authedRedirect("unauthenticated", "/settings")).toEqual({
      to: "/sign-in",
      search: { redirect: "/settings" },
    });
    expect(authedRedirect("loading", "/")).toEqual({
      to: "/sign-in",
      search: { redirect: "/" },
    });
  });

  it("lets authenticated users through", () => {
    expect(authedRedirect("authenticated", "/settings")).toBeNull();
  });

  it("sends authenticated users away from guest pages", () => {
    expect(guestRedirect("authenticated")).toEqual({ to: "/" });
    expect(guestRedirect("unauthenticated")).toBeNull();
  });
});
