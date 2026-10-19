import { Hono } from "hono";

import type { Auth } from "./auth/auth";
import type { ApiEnv } from "./env";

export interface AppDeps {
  auth: Auth;
  env: ApiEnv;
}

export function createApp({ auth }: AppDeps) {
  const app = new Hono();

  app.get("/health", (c) => {
    return c.json({ ok: true });
  });

  app.on(["GET", "POST"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  return app;
}
