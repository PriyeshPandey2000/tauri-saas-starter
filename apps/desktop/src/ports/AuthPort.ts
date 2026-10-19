/** Vendor-neutral identity of the signed-in user. */
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Current session. Tokens never appear here: they live in the OS keychain and
 * are read by the native layer.
 */
export interface AuthSession {
  user: AuthUser;
}

/** Authentication boundary. Implemented by an adapter in later milestones. */
export interface AuthPort {
  /** Return the current session, or `null` when signed out. */
  getSession(): Promise<AuthSession | null>;
  /** Sign in with email and password, returning the new session. */
  signInWithEmail(email: string, password: string): Promise<AuthSession>;
  /** Clear the local session and any stored credentials. */
  signOut(): Promise<void>;
}
