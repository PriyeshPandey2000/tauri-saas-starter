import { ports, type AuthSession } from "@/ports";
import { getConfig } from "@/shared/lib/config";

/**
 * Open the signed-in user's local database. No-op when notes are served by the
 * API (`VITE_NOTES_SOURCE=remote`). Failures surface through the database store
 * (error screen); the sign-out registry closes the database again.
 */
export function openUserDatabase(session: AuthSession | null): void {
  if (!session) {
    return;
  }
  try {
    // Config is validated at boot; a missing config means no local database.
    if (getConfig().VITE_NOTES_SOURCE === "remote") {
      return;
    }
  } catch {
    return;
  }
  void ports.database.open(session.user.id).catch(() => undefined);
}
