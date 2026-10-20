import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { getConnInfo } from "@hono/node-server/conninfo";

import type { Auth } from "./auth/auth";
import { createChallengeStore, type ChallengeStore } from "./auth/desktop-flow";
import { desktopAuthRoutes } from "./auth/desktop-routes";
import { createRateLimiter, resolveClientKey } from "./auth/rate-limit";
import { resolveTrustedOrigins } from "./auth/origins";
import { createRequireAuth, type AuthVariables } from "./auth/require-auth";
import {
  registerBillingReturnRoute,
  registerBillingRoutes,
} from "./billing/routes";
import { handleDodoWebhook } from "./billing/webhooks";
import { registerNotesRoutes } from "./notes/routes";
import type { ApiEnv } from "./env";
export {
  DEV_ORIGINS,
  TAURI_ORIGINS,
  resolveTrustedOrigins,
} from "./auth/origins";

export interface AppDeps {
  auth: Auth;
  env: ApiEnv;
  db?: import("./db/client").Database;
  challenges?: ChallengeStore;
}

function socketAddress(context: Context): string | undefined {
  try {
    const info = getConnInfo(context);
    return info.remote.address ?? info.remote.addressType;
  } catch {
    return undefined;
  }
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
  const billingLimiter = createRateLimiter({ max: 60, windowMs: 60_000 });
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
      origin: resolveTrustedOrigins(env),
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
    const key = resolveClientKey({
      headers: c.req.raw.headers,
      trustedProxyHeader: env.TRUSTED_PROXY_HEADER,
      socketAddress: socketAddress(c),
    });
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

  app.use("/billing/*", async (c, next) => {
    const key = resolveClientKey({
      headers: c.req.raw.headers,
      trustedProxyHeader: env.TRUSTED_PROXY_HEADER,
      socketAddress: socketAddress(c),
    });
    if (!billingLimiter.check(key)) {
      return c.json({ error: "rate_limited" }, 429);
    }
    await next();
    return;
  });
  registerBillingReturnRoute(app, env);

  if (db) {
    app.use("/billing/*", requireAuth);
    registerBillingRoutes(app, { db, env });

    app.post("/webhooks/dodo", async (c) => {
      const result = await handleDodoWebhook({ db, env }, await c.req.text(), {
        "webhook-id": c.req.header("webhook-id"),
        "webhook-timestamp": c.req.header("webhook-timestamp"),
        "webhook-signature": c.req.header("webhook-signature"),
      });
      return c.json(result.body, result.status);
    });

    app.use("/notes", requireAuth);
    app.use("/notes/*", requireAuth);
    registerNotesRoutes(app, db);
  }

  return app;
}
