import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings } from "@app/shared";

describe("parseSettings", () => {
  it("returns defaults when data is not an object", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when a field is invalid", () => {
    expect(parseSettings({ theme: "neon" })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ ...DEFAULT_SETTINGS, language: "" })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("keeps valid fields and fills missing ones with defaults", () => {
    expect(parseSettings({ theme: "dark" })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "dark",
    });
  });
});
