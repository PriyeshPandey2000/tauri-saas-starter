import { z } from "zod";
import type { Context } from "hono";

import type { Auth } from "./auth";
import {
  type ChallengeStore,
  constantTimeEqual,
  isBase64Url,
  pkceChallenge,
} from "./desktop-flow";
import type { ApiEnv } from "../env";

const OTT_TTL_MS = 3 * 60 * 1000;

const StartQuerySchema = z.object({
  state: z.string().refine((value) => isBase64Url(value, 32, 128)),
  challenge: z.string().refine((value) => isBase64Url(value, 32, 128)),
});

const ExchangeBodySchema = z.object({
  token: z.string().min(1).max(256),
  verifier: z.string().refine((value) => isBase64Url(value, 43, 128)),
});

export interface DesktopAuthDeps {
  auth: Auth;
  env: ApiEnv;
  challenges: ChallengeStore;
}

function deepLink(env: ApiEnv, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${env.APP_DEEP_LINK_SCHEME}://auth/callback?${query}`;
}

async function startOAuth(
  c: Context,
  { auth, env }: DesktopAuthDeps,
): Promise<Response> {
  const parsed = StartQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const callbackUrl =
    `${env.BETTER_AUTH_URL}/auth/desktop/callback` +
    `?state=${encodeURIComponent(parsed.data.state)}` +
    `&challenge=${encodeURIComponent(parsed.data.challenge)}`;

  const upstream = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: callbackUrl },
    asResponse: true,
  });
  if (!upstream.ok) {
    return c.json({ error: "oauth_start_failed" }, 502);
  }
  const data = (await upstream.json()) as { url?: string };
  if (!data.url) {
    return c.json({ error: "oauth_start_failed" }, 502);
  }

  const response = c.redirect(data.url, 302);
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

async function finishOAuth(
  c: Context,
  { auth, env, challenges }: DesktopAuthDeps,
): Promise<Response> {
  const parsed = StartQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.redirect(deepLink(env, { error: "invalid_request" }), 302);
  }
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.redirect(
      deepLink(env, { error: "session_missing", state: parsed.data.state }),
      302,
    );
  }
  const ott = await auth.api.generateOneTimeToken({
    headers: c.req.raw.headers,
  });
  challenges.set(ott.token, parsed.data.challenge, OTT_TTL_MS);
  return c.redirect(
    deepLink(env, { code: ott.token, state: parsed.data.state }),
    302,
  );
}

async function exchangeOAuth(
  c: Context,
  { auth, challenges }: DesktopAuthDeps,
): Promise<Response> {
  const parsed = ExchangeBodySchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const challenge = challenges.take(parsed.data.token);
  if (
    !challenge ||
    !constantTimeEqual(pkceChallenge(parsed.data.verifier), challenge)
  ) {
    return c.json({ error: "invalid_pkce" }, 400);
  }
  try {
    const result = await auth.api.verifyOneTimeToken({
      body: { token: parsed.data.token },
    });
    return c.json({
      sessionToken: result.session.token,
      expiresAt: result.session.expiresAt,
      user: result.user,
    });
  } catch {
    return c.json({ error: "invalid_token" }, 400);
  }
}

export function desktopAuthRoutes(deps: DesktopAuthDeps) {
  return {
    start: (c: Context) => startOAuth(c, deps),
    finish: (c: Context) => finishOAuth(c, deps),
    exchange: (c: Context) => exchangeOAuth(c, deps),
  };
}
