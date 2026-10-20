import { useTranslation } from "react-i18next";

import { useSettingsStore } from "../settings-store";

/**
 * First-run consent card. It is deliberately not a blocking modal: the user
 * can sign in and use the app while it is visible.
 */
export function ConsentPrompt() {
  const { t } = useTranslation();
  const consent = useSettingsStore((state) => state.telemetryConsent);
  const setConsent = useSettingsStore((state) => state.setTelemetryConsent);

  if (consent !== "unset") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-3 rounded-lg border border-input bg-background p-4 shadow-lg"
    >
      <h2 id="consent-title" className="text-sm font-semibold">
        {t("consent.title")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("consent.body")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          {t("consent.accept")}
        </button>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="h-8 rounded-md border border-input px-3 text-xs"
        >
          {t("consent.decline")}
        </button>
      </div>
    </div>
  );
}
