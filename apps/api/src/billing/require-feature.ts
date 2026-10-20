import type { MiddlewareHandler } from "hono";

import type { AuthVariables } from "../auth/require-auth";
import type { Database } from "../db/client";
import { loadCurrentSubscription, resolveAccess } from "./entitlement";

/**
 * Server-side entitlement check. Client gating is UX only; a tampered desktop
 * build still gets 403 here.
 */
export function createRequireFeature(
  db: Database,
): (feature: string) => MiddlewareHandler<{ Variables: AuthVariables }> {
  return (feature) => async (c, next) => {
    const sub = c.get("claims").sub;
    if (typeof sub !== "string" || sub.length === 0) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const row = await loadCurrentSubscription(db, sub);
    const access = resolveAccess(row);
    if (!access.features.includes(feature)) {
      return c.json({ error: "forbidden", feature }, 403);
    }
    await next();
    return;
  };
}
