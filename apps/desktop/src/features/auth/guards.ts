import type { AuthStatus } from "./store";

export type AuthedRedirect = {
  to: "/sign-in";
  search: { redirect: string };
} | null;

/** Where an authed-route visit must go, or null when it may continue. */
export function authedRedirect(
  status: AuthStatus,
  href: string,
): AuthedRedirect {
  if (status === "authenticated") {
    return null;
  }
  return { to: "/sign-in", search: { redirect: href } };
}

/** Guest pages are only for signed-out users. */
export function guestRedirect(status: AuthStatus): { to: "/" } | null {
  return status === "authenticated" ? { to: "/" } : null;
}
