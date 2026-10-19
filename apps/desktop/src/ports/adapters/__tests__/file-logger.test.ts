import { afterEach, describe, expect, it, vi } from "vitest";

const plugin = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-log", () => plugin);

import { fileLogger } from "../file-logger";

afterEach(() => {
  vi.restoreAllMocks();
  for (const call of Object.values(plugin)) {
    call.mockReset();
  }
});

describe("fileLogger", () => {
  it("sends a redacted line to the plugin", async () => {
    plugin.info.mockResolvedValue(undefined);
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

    fileLogger.info("user.signed-in", { token: "abc", user: "ada" });

    await vi.waitFor(() => expect(plugin.info).toHaveBeenCalledTimes(1));
    expect(plugin.info).toHaveBeenCalledWith(
      'user.signed-in {"token":"[REDACTED]","user":"ada"}',
    );
    expect(consoleInfo).not.toHaveBeenCalled();
  });

  it("falls back to console without logging through the same logger", async () => {
    plugin.warn.mockRejectedValue(new Error("capability denied"));
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    fileLogger.warn("theme.changed", { token: "abc" });

    await vi.waitFor(() => expect(consoleWarn).toHaveBeenCalledTimes(1));
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("[log fallback] theme.changed"),
      expect.any(Error),
    );
    expect(consoleWarn.mock.calls[0]?.[0]).not.toContain("abc");
    expect(plugin.warn).toHaveBeenCalledTimes(1);
  });
});
