import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { Auth } from "./auth/auth";
import { createChallengeStore, type ChallengeStore } from "./auth/desktop-flow";
import { desktopAuthRoutes } from "./auth/desktop-routes";
import { createRequireAuth, type AuthVariables } from "./auth/require-auth";
import type { ApiEnv } from "./env";

export interface AppDeps {
  auth: Auth;
  env: ApiEnv;
  challenges?: ChallengeStore;
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

export function createApp({ auth, env, challenges: injected }: AppDeps) {
  const challenges = injected ?? createChallengeStore();
  const desktopRoutes = desktopAuthRoutes({ auth, env, challenges });
  const requireAuth = createRequireAuth({
    jwksUrl: `${env.BETTER_AUTH_URL}/api/auth/jwks`,
    issuer: env.BETTER_AUTH_URL,
    audience: env.BETTER_AUTH_URL,
  });
  const app = new Hono<{ Variables: AuthVariables }>();

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

  app.get("/auth/desktop/start", desktopRoutes.start);
  app.get("/auth/desktop/callback", desktopRoutes.finish);
  app.post("/auth/desktop/exchange", desktopRoutes.exchange);

  app.get("/api/me", requireAuth, (c) => {
    const claims = c.get("claims");
    return c.json({ userId: claims.sub ?? null });
  });

  return app;
}
