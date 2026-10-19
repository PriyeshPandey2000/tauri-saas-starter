import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@app/shared": fileURLToPath(
        new URL("../../packages/shared/src", import.meta.url),
      ),
      "@tauri-apps/plugin-opener": fileURLToPath(
        new URL("./src/__tests__/stubs/plugin-opener.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // PGlite startup and password hashing are slow under CPU contention.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
