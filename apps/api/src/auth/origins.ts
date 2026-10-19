import type { ApiEnv } from "../env";

/** Exact webview origins: macOS/Linux use `tauri://`, Windows uses `http(s)://tauri.localhost`. */
export const TAURI_ORIGINS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
];
export const DEV_ORIGINS = ["http://localhost:1420"];

/**
 * Origins allowed to call the API: the Tauri webviews, the dev server outside
 * production, and any `CORS_ORIGINS` extras. Used for both Hono CORS and Better
 * Auth `trustedOrigins`, so the two can never drift apart.
 */
export function resolveTrustedOrigins(
  env: Pick<ApiEnv, "CORS_ORIGINS" | "NODE_ENV">,
): string[] {
  const extra = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const dev = env.NODE_ENV === "production" ? [] : DEV_ORIGINS;
  return [...TAURI_ORIGINS, ...dev, ...extra];
}
