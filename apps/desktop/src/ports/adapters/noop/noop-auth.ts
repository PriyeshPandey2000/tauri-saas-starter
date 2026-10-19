import type { AuthPort, AuthSession } from "../../AuthPort";

/** Auth adapter that never signs anyone in. */
export const noopAuth: AuthPort = {
  getSession(): Promise<AuthSession | null> {
    return Promise.resolve(null);
  },
  signInWithEmail(): Promise<AuthSession> {
    return Promise.reject(new Error("Auth is not configured yet"));
  },
  signOut(): Promise<void> {
    return Promise.resolve();
  },
};
