import type { AuthPort, AuthSession } from "../../AuthPort";

/** Auth adapter that never signs anyone in. */
export const noopAuth: AuthPort = {
  getSession(): Promise<AuthSession | null> {
    return Promise.resolve(null);
  },
  signUp() {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  signIn() {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  signInWithOAuth() {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  completeOAuthCallback() {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  refresh(): Promise<void> {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  signOut(): Promise<void> {
    return Promise.resolve();
  },
  deleteAccount(): Promise<void> {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  onAuthStateChange() {
    return () => undefined;
  },
};
