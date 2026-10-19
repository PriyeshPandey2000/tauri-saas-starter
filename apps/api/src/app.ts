import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { Auth } from "./auth/auth";
import { createChallengeStore, type ChallengeStore } from "./auth/desktop-flow";
import { desktopAuthRoutes } from "./auth/desktop-routes";
import { createRateLimiter } from "./auth/rate-limit";
import { createRequireAuth, type AuthVariables } from "./auth/require-auth";
import type { ApiEnv } from "./env";

export interface AppDeps {
  auth: Auth;
  env: ApiEnv;
  db?: import("./db/client").Database;
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
  env: Pick<ApiEnv, "CORS_ORIGINS" | "NODE_ENV">,
): string[] {
  const extra = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const dev = env.NODE_ENV === "production" ? [] : DEV_ORIGINS;
  return [...TAURI_ORIGINS, ...dev, ...extra];
}

export function createApp({ auth, env, db, challenges: injected }: AppDeps) {
  if (!injected && !db) {
    throw new Error("createApp needs a database or a challenge store");
  }
  const challenges = injected ?? createChallengeStore(db!);
  const desktopRoutes = desktopAuthRoutes({ auth, env, challenges });
  const requireAuth = createRequireAuth({
    jwksUrl: `${env.BETTER_AUTH_URL}/api/auth/jwks`,
    issuer: env.BETTER_AUTH_URL,
    audience: env.BETTER_AUTH_URL,
  });
  const desktopLimiter = createRateLimiter({ max: 30, windowMs: 60_000 });
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
      exposeHeaders: ["set-auth-token"],
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

  app.use("/auth/desktop/*", async (c, next) => {
    const key =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "local";
    if (!desktopLimiter.check(key)) {
      return c.json({ error: "rate_limited" }, 429);
    }
    await next();
    return;
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
