import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ports } from "@/ports";
import { getConfig } from "@/shared/lib/config";
import { useDatabaseStore } from "@/shared/lib/db-status";

interface DatabaseGateProps {
  /** Signed-in user id, or `null` before sign-in. */
  userId: string | null;
  children: ReactNode;
}

/**
 * Waits for the signed-in user's local database to open before showing authed
 * screens. The database is opened in the auth flow and closed by the sign-out
 * registry. A failed open or migration shows an error screen; on-disk data
 * stays intact.
 */
export function DatabaseGate({ userId, children }: DatabaseGateProps) {
  const { t } = useTranslation();
  const phase = useDatabaseStore((state) => state.phase);
  const error = useDatabaseStore((state) => state.error);
  const remote = getConfig().VITE_NOTES_SOURCE === "remote";

  useEffect(() => {
    if (!remote && userId) {
      void ports.database.open(userId).catch(() => undefined);
    }
  }, [remote, userId]);

  if (remote) {
    return <>{children}</>;
  }

  if (phase === "error") {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <h1 className="text-xl font-semibold">{t("db.errorTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("db.errorBody")}</p>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (userId) {
              void ports.database.open(userId).catch(() => undefined);
            }
          }}
          className="h-9 rounded-md border border-input px-4 text-sm"
        >
          {t("db.retry")}
        </button>
      </section>
    );
  }

  if (phase !== "ready") {
    return (
      <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
        {t("db.opening")}
      </div>
    );
  }

  return <>{children}</>;
}
