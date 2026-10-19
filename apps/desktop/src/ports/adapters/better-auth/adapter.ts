import { z } from "zod";

import { AUTH_CALLBACK_URL } from "../../../shared/lib/app-links";
import {
  deleteSecureValue,
  getSecureValue,
  setSecureValue,
} from "../../../shared/lib/secureStorage";
import type {
  AuthPort,
  AuthSession,
  AuthStateListener,
  OAuthProvider,
  SignUpResult,
} from "../../AuthPort";

export const AUTH_KEYS = {
  sessionToken: "auth.sessionToken",
  accessToken: "auth.accessToken",
  accessExpiresAt: "auth.accessExpiresAt",
  user: "auth.user",
} as const;

const ACCESS_SKEW_MS = 60_000;
const OAUTH_STATE_TTL_MS = 10 * 60_000;

export class AuthError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(
    message: string,
    options: { code?: string; status?: number | null } = {},
  ) {
    super(message);
    this.name = "AuthError";
    this.code = options.code ?? "auth_error";
    this.status = options.status ?? null;
  }
}

export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const defaultStore: SecureStore = {
  get: (key) => getSecureValue(key),
  set: (key, value) => setSecureValue(key, value),
  remove: (key) => deleteSecureValue(key),
};

const RemoteUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  emailVerified: z.boolean(),
});

const RemoteSessionSchema = z.object({
  session: z.object({
    token: z.string(),
    expiresAt: z.union([z.string(), z.date()]),
  }),
  user: RemoteUserSchema,
});

const AccessTokenResponseSchema = z.object({ token: z.string() });
const ExchangeResponseSchema = z.object({
  sessionToken: z.string(),
  expiresAt: z.union([z.string(), z.date()]),
  user: RemoteUserSchema,
});

function toSession(
  user: z.infer<typeof RemoteUserSchema>,
  expiresAt: string | Date,
): AuthSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
    },
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomBase64Url(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64Url(buffer);
}

async function s256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return base64Url(new Uint8Array(digest));
}

export function constantTimeStringEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function jwtExpiry(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) {
    return null;
  }
  try {
    const payload = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface PendingOAuth {
  state: string;
  verifier: string;
  expiresAt: number;
}

export interface BetterAuthAdapterOptions {
  getApiUrl: () => string;
  store?: SecureStore;
  openExternal?: (url: string) => Promise<void>;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function createBetterAuthAdapter(
  options: BetterAuthAdapterOptions,
): AuthPort {
  const store = options.store ?? defaultStore;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? Date.now;
  const listeners = new Set<AuthStateListener>();
  let pendingOAuth: PendingOAuth | null = null;
  let refreshPromise: Promise<void> | null = null;

  const authBase = () => `${options.getApiUrl()}/api/auth`;

  function emit(session: AuthSession | null): void {
    for (const listener of listeners) {
      listener.onStateChange(session);
    }
  }

  async function persistSession(
    sessionToken: string,
    session: AuthSession,
  ): Promise<void> {
    await store.set(AUTH_KEYS.sessionToken, sessionToken);
    await store.set(AUTH_KEYS.user, JSON.stringify(session.user));
  }

  async function clearLocal(): Promise<void> {
    for (const key of Object.values(AUTH_KEYS)) {
      await store.remove(key).catch(() => undefined);
    }
    emit(null);
  }

  async function readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function errorFrom(body: unknown, status: number): AuthError {
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === "string") {
        return new AuthError(message, { status });
      }
    }
    return new AuthError(`Request failed with status ${status}`, { status });
  }

  async function mintAccessToken(sessionToken: string): Promise<void> {
    const response = await fetchImpl(`${authBase()}/token`, {
      headers: { authorization: `Bearer ${sessionToken}` },
    });
    if (response.status === 401) {
      await clearLocal();
      throw new AuthError("Session expired", { status: 401 });
    }
    const parsed = AccessTokenResponseSchema.safeParse(
      await readJson(response),
    );
    if (!response.ok || !parsed.success) {
      throw new AuthError("Could not mint an access token", {
        status: response.status,
      });
    }
    const expiresAt = jwtExpiry(parsed.data.token) ?? now() + 14 * 60_000;
    await store.set(AUTH_KEYS.accessToken, parsed.data.token);
    await store.set(AUTH_KEYS.accessExpiresAt, String(expiresAt));
  }

  async function ensureAccessToken(): Promise<void> {
    const [token, expiresAt] = await Promise.all([
      store.get(AUTH_KEYS.accessToken),
      store.get(AUTH_KEYS.accessExpiresAt),
    ]);
    const expiry = expiresAt ? Number(expiresAt) : 0;
    if (token && Number.isFinite(expiry) && expiry - ACCESS_SKEW_MS > now()) {
      return;
    }
    await refresh();
  }

  async function refresh(): Promise<void> {
    if (refreshPromise) {
      return refreshPromise;
    }
    refreshPromise = (async () => {
      const sessionToken = await store.get(AUTH_KEYS.sessionToken);
      if (!sessionToken) {
        throw new AuthError("Not signed in");
      }
      await mintAccessToken(sessionToken);
    })().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  return {
    async getSession() {
      const sessionToken = await store.get(AUTH_KEYS.sessionToken);
      if (!sessionToken) {
        return null;
      }
      const response = await fetchImpl(`${authBase()}/get-session`, {
        headers: { authorization: `Bearer ${sessionToken}` },
      });
      const body = await readJson(response);
      const parsed = RemoteSessionSchema.safeParse(body);
      if (!response.ok || !parsed.success) {
        await clearLocal();
        return null;
      }
      const session = toSession(
        parsed.data.user,
        parsed.data.session.expiresAt,
      );
      await store.set(AUTH_KEYS.user, JSON.stringify(session.user));
      await ensureAccessToken();
      emit(session);
      return session;
    },

    async signUp(input) {
      const response = await fetchImpl(`${authBase()}/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw errorFrom(body, response.status);
      }
      const token =
        response.headers.get("set-auth-token") ??
        (body && typeof body === "object" && "token" in body
          ? String((body as { token: unknown }).token)
          : null);
      const parsed = RemoteSessionSchema.safeParse(body);
      if (!token || !parsed.success) {
        return { status: "verification_required" } satisfies SignUpResult;
      }
      const session = toSession(
        parsed.data.user,
        parsed.data.session.expiresAt,
      );
      await persistSession(token, session);
      await ensureAccessToken();
      emit(session);
      return { status: "authenticated", session };
    },

    async signIn(input) {
      const response = await fetchImpl(`${authBase()}/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw errorFrom(body, response.status);
      }
      const token =
        response.headers.get("set-auth-token") ??
        (body && typeof body === "object" && "token" in body
          ? String((body as { token: unknown }).token)
          : null);
      const parsed = RemoteSessionSchema.safeParse(body);
      if (!token || !parsed.success) {
        throw new AuthError("Sign-in did not return a session");
      }
      const session = toSession(
        parsed.data.user,
        parsed.data.session.expiresAt,
      );
      await persistSession(token, session);
      await ensureAccessToken();
      emit(session);
      return session;
    },

    async signInWithOAuth(provider: OAuthProvider) {
      const state = randomBase64Url(32);
      const verifier = randomBase64Url(32);
      const challenge = await s256(verifier);
      pendingOAuth = {
        state,
        verifier,
        expiresAt: now() + OAUTH_STATE_TTL_MS,
      };
      const query = new URLSearchParams({
        state,
        challenge,
        provider,
      }).toString();
      const url = `${options.getApiUrl()}/auth/desktop/start?${query}`;
      if (options.openExternal) {
        await options.openExternal(url);
        return;
      }
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    },

    async completeOAuthCallback(callbackUrl) {
      const pending = pendingOAuth;
      pendingOAuth = null;
      const url = new URL(callbackUrl);
      if (
        `${url.protocol}//${url.host}/${url.pathname.replace(/^\//, "")}` !==
        AUTH_CALLBACK_URL
      ) {
        throw new AuthError("Unexpected deep link");
      }
      const error = url.searchParams.get("error");
      if (error) {
        throw new AuthError(`Sign-in failed: ${error}`, { code: error });
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!pending || !code || !state) {
        throw new AuthError("No pending sign-in");
      }
      if (now() > pending.expiresAt) {
        throw new AuthError("Sign-in timed out");
      }
      if (!constantTimeStringEqual(state, pending.state)) {
        throw new AuthError("Sign-in state mismatch", {
          code: "state_mismatch",
        });
      }

      const response = await fetchImpl(
        `${options.getApiUrl()}/auth/desktop/exchange`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: code, verifier: pending.verifier }),
        },
      );
      const body = await readJson(response);
      const parsed = ExchangeResponseSchema.safeParse(body);
      if (!response.ok || !parsed.success) {
        throw errorFrom(body, response.status);
      }
      const session = toSession(parsed.data.user, parsed.data.expiresAt);
      await persistSession(parsed.data.sessionToken, session);
      await ensureAccessToken();
      emit(session);
      return session;
    },

    refresh,

    async signOut() {
      const sessionToken = await store.get(AUTH_KEYS.sessionToken);
      if (sessionToken) {
        await fetchImpl(`${authBase()}/sign-out`, {
          method: "POST",
          headers: { authorization: `Bearer ${sessionToken}` },
        }).catch(() => undefined);
      }
      await clearLocal();
    },

    onAuthStateChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
