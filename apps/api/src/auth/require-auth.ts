import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { MiddlewareHandler } from "hono";

export interface RequireAuthOptions {
  jwksUrl: string;
  issuer: string;
  audience: string;
}

export type AuthVariables = { claims: JWTPayload };

/**
 * Verify a Better Auth access JWT through JWKS (issuer, audience, exp, 30s
 * leeway). Every protected route must use this middleware.
 */
export function createRequireAuth(
  options: RequireAuthOptions,
): MiddlewareHandler<{ Variables: AuthVariables }> {
  const jwks = createRemoteJWKSet(new URL(options.jwksUrl));

  return async (c, next) => {
    const header = c.req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      return c.json({ error: "unauthorized" }, 401);
    }
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: options.issuer,
        audience: options.audience,
        clockTolerance: 30,
      });
      c.set("claims", payload);
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
    return;
  };
}
