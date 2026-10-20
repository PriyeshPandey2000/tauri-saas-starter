import { describe, expect, it } from "vitest";

import { AppSettingsSchema, DEFAULT_SETTINGS } from "@app/shared";

describe("native settings", () => {
  it("defaults native features off, with a shortcut and stable channel", () => {
    expect(DEFAULT_SETTINGS.closeToTray).toBe(false);
    expect(DEFAULT_SETTINGS.launchAtLogin).toBe(false);
    expect(DEFAULT_SETTINGS.notificationsEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.globalShortcut).toBe(
      "CommandOrControl+Shift+Space",
    );
    expect(DEFAULT_SETTINGS.updateChannel).toBe("stable");
  });

  it("accepts an empty shortcut (disabled) and rejects a too-long one", () => {
    expect(AppSettingsSchema.safeParse({ globalShortcut: "" }).success).toBe(
      true,
    );
    expect(
      AppSettingsSchema.safeParse({ globalShortcut: "x".repeat(65) }).success,
    ).toBe(false);
  });

  it("only accepts stable or beta channels", () => {
    expect(AppSettingsSchema.safeParse({ updateChannel: "beta" }).success).toBe(
      true,
    );
    expect(
      AppSettingsSchema.safeParse({ updateChannel: "nightly" }).success,
    ).toBe(false);
  });
});
