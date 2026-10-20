import { useTranslation } from "react-i18next";

import { useEntitlementStore } from "../entitlement-store";

export function PastDueBanner() {
  const { t } = useTranslation();
  const status = useEntitlementStore((state) => state.entitlement?.status);
  if (status !== "past_due") {
    return null;
  }
  return (
    <div
      role="status"
      className="border-b border-destructive/40 bg-destructive/5 px-4 py-2 text-center text-sm text-destructive"
    >
      {t("billing.pastDue")}
    </div>
  );
}
