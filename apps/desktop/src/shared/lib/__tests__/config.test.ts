import { describe, expect, it } from "vitest";

import { ConfigError, parseConfig, resolveLogTarget } from "../config";

const validEnv = {
  VITE_API_URL: "https://api.example.com",
  VITE_APP_ENV: "dev",
};

describe("parseConfig", () => {
  it("accepts a valid environment", () => {
    expect(parseConfig(validEnv)).toEqual(validEnv);
  });

  it("accepts optional vendor keys", () => {
    expect(
      parseConfig({
        ...validEnv,
        VITE_POSTHOG_KEY: "ph-key",
        VITE_POSTHOG_HOST: "https://us.i.posthog.com",
        VITE_SENTRY_DSN: "https://public@sentry.example.com/1",
      }),
    ).toMatchObject({ VITE_POSTHOG_KEY: "ph-key" });
  });

  it("rejects a missing API URL", () => {
    try {
      parseConfig({ VITE_APP_ENV: "dev" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toEqual([
        "VITE_API_URL: Invalid input: expected string, received undefined",
      ]);
    }
  });

  it("rejects an unknown app env", () => {
    expect(() => parseConfig({ ...validEnv, VITE_APP_ENV: "qa" })).toThrow(
      ConfigError,
    );
  });

  it("rejects a non-URL API URL and reports the field", () => {
    try {
      parseConfig({ ...validEnv, VITE_API_URL: "not-a-url" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues[0]).toMatch(/^VITE_API_URL: /);
    }
  });
});

describe("resolveLogTarget", () => {
  it("defaults to console in dev and file otherwise", () => {
    expect(resolveLogTarget({}, true)).toBe("console");
    expect(resolveLogTarget({}, false)).toBe("file");
  });

  it("honours an explicit target over the default", () => {
    expect(resolveLogTarget({ VITE_LOG_TARGET: "file" }, true)).toBe("file");
    expect(resolveLogTarget({ VITE_LOG_TARGET: "console" }, false)).toBe(
      "console",
    );
  });

  it("ignores an invalid target and falls back", () => {
    expect(resolveLogTarget({ VITE_LOG_TARGET: "syslog" }, false)).toBe("file");
  });

  it("is validated by parseConfig", () => {
    expect(
      parseConfig({ ...validEnv, VITE_LOG_TARGET: "console" }),
    ).toMatchObject({ VITE_LOG_TARGET: "console" });
    expect(() =>
      parseConfig({ ...validEnv, VITE_LOG_TARGET: "syslog" }),
    ).toThrow(ConfigError);
  });
});
