import type { Entitlement, PlanSummary } from "@app/shared";

import type { AnalyticsPort } from "../../AnalyticsPort";
import type { AuthPort, AuthSession, AuthStateListener } from "../../AuthPort";
import type { BillingPort } from "../../BillingPort";
import type { FeatureFlagPort } from "../../FeatureFlagPort";
import { DEFAULT_FLAGS, type FlagKey } from "@app/shared";

const listeners = new Set<AuthStateListener>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function sessionFromStorage(): AuthSession | null {
  return read<AuthSession | null>("e2e-session", null);
}

function emit(session: AuthSession | null): void {
  for (const listener of listeners) {
    listener.onStateChange(session);
  }
}

function makeSession(email: string): AuthSession {
  const id = email.split("@")[0] ?? "user";
  return {
    user: {
      id,
      email,
      name: id,
      image: null,
      emailVerified: true,
    },
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export const e2eAuth: AuthPort = {
  getSession: async () => sessionFromStorage(),
  signUp: async (input) => {
    const session = makeSession(input.email);
    localStorage.setItem("e2e-session", JSON.stringify(session));
    localStorage.setItem("e2e-token", session.user.id);
    emit(session);
    return { status: "authenticated", session };
  },
  signIn: async (input) => {
    const session = makeSession(input.email);
    localStorage.setItem("e2e-session", JSON.stringify(session));
    localStorage.setItem("e2e-token", session.user.id);
    emit(session);
    return session;
  },
  signInWithOAuth: async () => undefined,
  completeOAuthCallback: async () => makeSession("oauth@example.com"),
  refresh: async () => undefined,
  signOut: async () => {
    localStorage.removeItem("e2e-session");
    localStorage.removeItem("e2e-token");
    emit(null);
  },
  deleteAccount: async () => {
    localStorage.removeItem("e2e-session");
    emit(null);
  },
  onAuthStateChange: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const e2eBilling: BillingPort = {
  getEntitlement: async () => read<Entitlement | null>("e2e-entitlement", null),
  startCheckout: async () => ({ url: "https://example.com/checkout" }),
  openPortal: async () => ({ url: "https://example.com/portal" }),
  getPlans: async (): Promise<PlanSummary[]> => [
    { key: "free", name: "Free", features: [] },
    { key: "pro", name: "Pro", features: ["export", "sync"] },
  ],
};

export function createE2eFlags(): FeatureFlagPort {
  const flags = read<Record<string, unknown>>("e2e-flags", {});
  const values = { ...DEFAULT_FLAGS, ...flags } as Record<FlagKey, unknown>;
  return {
    init: async () => undefined,
    get: (key) => values[key] as never,
    getAll: () => ({ ...values }) as never,
    getSource: () => "remote",
    refresh: async () => undefined,
    subscribe: () => () => undefined,
    reset: async () => undefined,
    setConsent: () => undefined,
    canOverride: () => true,
    setOverride: async (key, value) => {
      values[key] = value;
    },
    clearOverride: async (key) => {
      values[key] = DEFAULT_FLAGS[key];
    },
    clearOverrides: async () => undefined,
  };
}

export function createE2eAnalytics(): AnalyticsPort {
  const bag = { calls: [] as { event: string; properties: unknown }[] };
  Object.assign(window, { __e2eAnalytics: bag });
  let consent = false;
  return {
    track: async (event, properties) => {
      if (consent) bag.calls.push({ event, properties });
    },
    page: async (path) => {
      if (consent) bag.calls.push({ event: "$pageview", properties: path });
    },
    identify: async () => undefined,
    reset: async () => undefined,
    setConsent: (granted) => {
      consent = granted;
    },
  };
}
