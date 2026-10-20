import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Gate } from "@/features/billing";

export const Route = createFileRoute("/_authed/export")({
  component: ExportPage,
});

function ExportPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">{t("billing.exportTitle")}</h1>
      <Gate feature="export">
        <p className="text-sm text-muted-foreground">
          {t("billing.exportBody")}
        </p>
      </Gate>
    </section>
  );
}
