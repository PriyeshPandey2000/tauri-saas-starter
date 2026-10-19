import { create } from "zustand";

import { ports } from "@/ports";
import { runSignOutHandlers } from "./sign-out-registry";
import type { AuthSession } from "@/ports";
import type { SignInInput, SignUpInput } from "@app/shared";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type SignUpOutcome = "authenticated" | "verification_required";

interface AuthStore {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  initialized: boolean;
  clearError(): void;
  signIn(input: SignInInput): Promise<void>;
  signUp(input: SignUpInput): Promise<SignUpOutcome>;
  signInWithOAuth(): Promise<void>;
  completeOAuth(callbackUrl: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: "loading",
  session: null,
  error: null,
  initialized: false,

  clearError() {
    set({ error: null });
  },

  async signIn(input) {
    set({ error: null, status: "loading" });
    try {
      const session = await ports.auth.signIn(input);
      set({ session, status: "authenticated" });
    } catch (error) {
      set({ status: "unauthenticated", error: messageOf(error) });
      throw error;
    }
  },

  async signUp(input) {
    set({ error: null, status: "loading" });
    try {
      const result = await ports.auth.signUp(input);
      if (result.status === "authenticated") {
        set({ session: result.session, status: "authenticated" });
        return "authenticated";
      }
      set({ status: "unauthenticated" });
      return "verification_required";
    } catch (error) {
      set({ status: "unauthenticated", error: messageOf(error) });
      throw error;
    }
  },

  async signInWithOAuth() {
    set({ error: null });
    try {
      await ports.auth.signInWithOAuth("google");
    } catch (error) {
      set({ error: messageOf(error) });
      throw error;
    }
  },

  async completeOAuth(callbackUrl) {
    set({ error: null, status: "loading" });
    try {
      const session = await ports.auth.completeOAuthCallback(callbackUrl);
      set({ session, status: "authenticated" });
    } catch (error) {
      set({ status: "unauthenticated", error: messageOf(error) });
      throw error;
    }
  },

  async signOut() {
    try {
      await ports.auth.signOut();
    } finally {
      await runSignOutHandlers();
      set({ session: null, status: "unauthenticated", error: null });
    }
  },

  async deleteAccount() {
    await ports.auth.deleteAccount();
    await runSignOutHandlers();
    set({ session: null, status: "unauthenticated", error: null });
  },
}));

let initPromise: Promise<void> | null = null;
let listening = false;

/** Restore the session once; route guards and the shell await this. */
export function initializeAuth(): Promise<void> {
  if (!initPromise) {
    if (!listening) {
      listening = true;
      ports.auth.onAuthStateChange({
        onStateChange(session) {
          useAuthStore.setState({
            session,
            status: session ? "authenticated" : "unauthenticated",
          });
        },
      });
    }
    initPromise = (async () => {
      try {
        const session = await ports.auth.getSession();
        useAuthStore.setState({
          session,
          status: session ? "authenticated" : "unauthenticated",
          initialized: true,
        });
      } catch (error) {
        useAuthStore.setState({
          session: null,
          status: "unauthenticated",
          initialized: true,
          error: messageOf(error),
        });
      }
    })();
  }
  return initPromise;
}
