import { describe, expect, it } from "vitest";

import { DEV_ORIGINS, TAURI_ORIGINS, resolveCorsOrigins } from "../app";

describe("cors origins", () => {
  it("allows the dev origin outside production", () => {
    const origins = resolveCorsOrigins({
      NODE_ENV: "development",
      CORS_ORIGINS: undefined,
    });
    expect(origins).toEqual(expect.arrayContaining(DEV_ORIGINS));
  });

  it("drops the dev origin in production but keeps Tauri origins", () => {
    const origins = resolveCorsOrigins({
      NODE_ENV: "production",
      CORS_ORIGINS: undefined,
    });
    expect(origins).not.toContain("http://localhost:1420");
    expect(origins).toEqual(expect.arrayContaining(TAURI_ORIGINS));
  });
});
