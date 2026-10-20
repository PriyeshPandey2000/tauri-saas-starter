import { useState } from "react";
import { useTranslation } from "react-i18next";

import { commands } from "@/shared/ipc/bindings";
import { getConfig } from "@/shared/lib/config";
import { scrubText } from "@/shared/lib/scrub";
import { ports } from "@/ports";

const MAILTO_LIMIT = 6_000;

/** Shows the redacted bundle and requires an explicit confirm before sending. */
export function ReportProblem() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setError(null);
    const result = await commands.readLogTail();
    if (result.status === "error") {
      setError(result.error.message);
      return;
    }
    setPreview(scrubText(result.data));
  }

  async function send() {
    if (!preview || !confirmed) {
      return;
    }
    const config = getConfig();
    const summary = `${t("settings.reportIntro")}\n\n${preview.slice(0, MAILTO_LIMIT)}`;
    if (config.VITE_SUPPORT_URL) {
      await ports.opener.open(config.VITE_SUPPORT_URL);
      return;
    }
    if (config.VITE_SUPPORT_EMAIL) {
      const mailto = `mailto:${config.VITE_SUPPORT_EMAIL}?subject=${encodeURIComponent(
        t("settings.reportSubject"),
      )}&body=${encodeURIComponent(summary)}`;
      await ports.opener.open(mailto);
      return;
    }
    setError(t("settings.reportMissingSupport"));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t("settings.reportBody")}
      </p>
      <button
        type="button"
        onClick={() => void loadPreview()}
        className="h-8 w-fit rounded-md border border-input px-3 text-xs"
      >
        {t("settings.reportPreview")}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {preview !== null && (
        <>
          <p className="text-xs font-medium">{t("settings.reportAttached")}</p>
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-[10px] text-muted-foreground">
            {preview || t("settings.reportEmpty")}
          </pre>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="accent-primary"
            />
            {t("settings.reportConfirm")}
          </label>
          <button
            type="button"
            disabled={!confirmed}
            onClick={() => void send()}
            className="h-8 w-fit rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {t("settings.reportSend")}
          </button>
        </>
      )}
    </div>
  );
}
