import { describe, expect, it } from "vitest";

import { getNavItems, registerNavItem } from "@/shared/lib/nav";

describe("nav registry", () => {
  it("includes the built-in home entry", () => {
    expect(getNavItems().some((item) => item.id === "home")).toBe(true);
  });

  it("sorts entries by order", () => {
    registerNavItem({ id: "zzz", labelKey: "k", to: "/zzz", order: 99 });

    const ids = getNavItems().map((item) => item.id);

    expect(ids).toContain("zzz");
    expect(ids.indexOf("home")).toBeLessThan(ids.indexOf("zzz"));
  });
});
