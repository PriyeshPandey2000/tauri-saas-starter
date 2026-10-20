import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function UpgradePrompt({ feature }: { feature?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-input p-6">
      <p className="text-sm font-medium">{t("billing.upgradeTitle")}</p>
      <p className="text-sm text-muted-foreground">
        {feature
          ? t("billing.upgradeFeature", { feature })
          : t("billing.upgradeBody")}
      </p>
      <Link
        to="/pricing"
        className="mt-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
      >
        {t("billing.viewPlans")}
      </Link>
    </div>
  );
}
