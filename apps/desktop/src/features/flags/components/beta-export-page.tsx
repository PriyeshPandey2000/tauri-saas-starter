import { useTranslation } from "react-i18next";

export function BetaExportPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">{t("betaExport.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("betaExport.body")}</p>
    </section>
  );
}
