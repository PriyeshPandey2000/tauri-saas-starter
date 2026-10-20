import { afterEach, describe, expect, it, vi } from "vitest";

const commands = vi.hoisted(() => ({
  updaterConfigured: vi.fn(async () => true),
  checkUpdate: vi.fn(),
  installUpdate: vi.fn(),
}));

vi.mock("@/shared/ipc/bindings", () => ({ commands }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    loading: vi.fn(() => 1),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));
vi.mock("@/features/settings", () => ({
  useSettingsStore: {
    getState: () => ({ updateChannel: "stable" }),
  },
}));
vi.mock("@/ports", () => ({
  ports: {
    featureFlags: { get: () => false },
    errorReporter: { captureException: vi.fn() },
  },
}));

const { resolveUpdateChannel, checkForUpdates, startUpdateChecks } =
  await import("../updater");

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("updater", () => {
  it("gates beta behind the flag and the setting", () => {
    expect(resolveUpdateChannel(false, "beta")).toBe("stable");
    expect(resolveUpdateChannel(true, "stable")).toBe("stable");
    expect(resolveUpdateChannel(true, "beta")).toBe("beta");
  });

  it("is a quiet no-op when the updater is not configured", async () => {
    const onError = vi.fn();
    const checkUpdate = vi.fn();
    await checkForUpdates({
      isConfigured: async () => false,
      checkUpdate,
      onError,
    });
    expect(checkUpdate).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("never throws when a real check fails", async () => {
    const onError = vi.fn();
    await expect(
      checkForUpdates({
        isConfigured: async () => true,
        checkUpdate: async () => {
          throw new Error("offline");
        },
        onError,
      }),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  it("defers the first check and repeats every 6 hours", async () => {
    vi.useFakeTimers();
    const checkNow = vi.fn(async () => undefined);
    const stop = startUpdateChecks({ checkNow });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(checkNow).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(checkNow).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1_000);
    expect(checkNow).toHaveBeenCalledTimes(2);
    stop();
  });
});
