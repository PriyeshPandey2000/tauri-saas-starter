import type { SignInInput, SignUpInput } from "@app/shared";

/** Vendor-neutral identity of the signed-in user. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
}

/**
 * Current session. Tokens never appear here: the adapter keeps them in the OS
 * keychain.
 */
export interface AuthSession {
  user: AuthUser;
  expiresAt: string;
}

export type OAuthProvider = "google";

/** Sign-up may not create a session when email verification is required. */
export type SignUpResult =
  | { status: "authenticated"; session: AuthSession }
  | { status: "verification_required" };

export interface AuthStateListener {
  onStateChange(session: AuthSession | null): void;
}

/** Authentication boundary. The real adapter is BetterAuthAdapter. */
export interface AuthPort {
  /** Return the current session (keychain + server check), or `null`. */
  getSession(): Promise<AuthSession | null>;
  /** Create an account. */
  signUp(input: SignUpInput): Promise<SignUpResult>;
  /** Sign in with email and password. */
  signIn(input: SignInInput): Promise<AuthSession>;
  /** Open the system browser for an OAuth provider. */
  signInWithOAuth(provider: OAuthProvider): Promise<void>;
  /** Exchange the deep-link callback for a session. */
  completeOAuthCallback(callbackUrl: string): Promise<AuthSession>;
  /** Mint a fresh access token from the stored session token. */
  refresh(): Promise<void>;
  /** Clear local credentials and the server session. */
  signOut(): Promise<void>;
  /** Permanently delete the signed-in account. */
  deleteAccount(): Promise<void>;
  /** Subscribe to local auth transitions; returns an unsubscribe function. */
  onAuthStateChange(listener: AuthStateListener): () => void;
}
