import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">{t("notFound.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("notFound.description")}
      </p>
      <Button asChild>
        <Link to="/">{t("notFound.backHome")}</Link>
      </Button>
    </div>
  );
}
