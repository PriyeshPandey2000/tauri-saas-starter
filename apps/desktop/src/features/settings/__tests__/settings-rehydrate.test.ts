import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "@app/shared";

async function rehydrateWith(getValue: () => unknown) {
  vi.resetModules();
  vi.doMock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
  vi.doMock("@tauri-apps/plugin-store", () => ({
    load: vi.fn(async () => ({
      get: vi.fn(async () => getValue()),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => true),
    })),
  }));

  const { useSettingsStore } = await import("../settings-store");
  await useSettingsStore.persist.rehydrate();
  return useSettingsStore.getState();
}

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock("@tauri-apps/api/core");
  vi.doUnmock("@tauri-apps/plugin-store");
});

describe("settings rehydrate", () => {
  it("falls back to defaults on invalid JSON", async () => {
    const state = await rehydrateWith(() => "{ not valid json");
    expect(state.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(state.language).toBe(DEFAULT_SETTINGS.language);
  });

  it("falls back to defaults for a non-string value", async () => {
    const state = await rehydrateWith(() => 42);
    expect(state.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(state.telemetryConsent).toBe(DEFAULT_SETTINGS.telemetryConsent);
  });

  it("falls back to defaults for a missing key", async () => {
    const state = await rehydrateWith(() => undefined);
    expect(state.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(state.sidebarCollapsed).toBe(DEFAULT_SETTINGS.sidebarCollapsed);
  });

  it("applies a valid stored value", async () => {
    const state = await rehydrateWith(() =>
      JSON.stringify({
        state: { ...DEFAULT_SETTINGS, theme: "dark" },
        version: 0,
      }),
    );
    expect(state.theme).toBe("dark");
  });
});
