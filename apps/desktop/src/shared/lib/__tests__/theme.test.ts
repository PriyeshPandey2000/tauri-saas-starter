import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTheme } from "../theme";

function setSystemPrefersDark(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveTheme", () => {
  it("keeps explicit themes", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("follows the OS preference for system", () => {
    setSystemPrefersDark(true);
    expect(resolveTheme("system")).toBe("dark");

    setSystemPrefersDark(false);
    expect(resolveTheme("system")).toBe("light");
  });
});
