import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/features/auth";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_authed/account")({
  component: AccountPage,
});

function AccountPage() {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("auth.account.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {session?.user.email ?? ""}
        </p>
      </header>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void signOut()}>
          {t("auth.account.signOut")}
        </Button>
        {confirmingDelete ? (
          <>
            <Button
              variant="destructive"
              onClick={() =>
                void deleteAccount().catch((cause: unknown) =>
                  setError(
                    cause instanceof Error ? cause.message : String(cause),
                  ),
                )
              }
            >
              {t("auth.account.confirmDelete")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              {t("auth.account.cancel")}
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            {t("auth.account.delete")}
          </Button>
        )}
      </div>
    </section>
  );
}
