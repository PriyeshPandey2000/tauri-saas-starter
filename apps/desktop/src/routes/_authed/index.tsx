import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-3 p-8">
      <h1 className="text-3xl font-semibold">{t("app.name")}</h1>
      <p className="text-sm text-muted-foreground">{t("nav.home")}</p>
    </section>
  );
}
