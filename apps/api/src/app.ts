import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { Auth } from "./auth/auth";
import type { ApiEnv } from "./env";

export interface AppDeps {
  auth: Auth;
  env: ApiEnv;
}

/** Exact webview origins: macOS/Linux use `tauri://`, Windows uses `http(s)://tauri.localhost`. */
export const TAURI_ORIGINS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
];
export const DEV_ORIGINS = ["http://localhost:1420"];

export function resolveCorsOrigins(
  env: Pick<ApiEnv, "CORS_ORIGINS">,
): string[] {
  const extra = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...TAURI_ORIGINS, ...DEV_ORIGINS, ...extra];
}

export function createApp({ auth, env }: AppDeps) {
  const app = new Hono();

  app.use(
    "*",
    secureHeaders({
      referrerPolicy: "no-referrer",
      crossOriginOpenerPolicy: "same-origin",
    }),
  );
  app.use(
    "*",
    cors({
      origin: resolveCorsOrigins(env),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
      maxAge: 600,
    }),
  );

  app.get("/health", (c) => {
    return c.json({ ok: true });
  });

  app.on(["GET", "POST"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  return app;
}
