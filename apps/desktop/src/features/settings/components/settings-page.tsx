import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AppSettingsSchema, type AppSettings } from "@app/shared";
import { applyTheme } from "@/shared/lib/theme";

import { useSettingsStore } from "../settings-store";

export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const telemetryConsent = useSettingsStore((state) => state.telemetryConsent);

  const form = useForm<AppSettings>({
    defaultValues: { theme, language, sidebarCollapsed, telemetryConsent },
  });

  const watchedTheme = useWatch({ control: form.control, name: "theme" });
  const watchedLanguage = useWatch({ control: form.control, name: "language" });
  const watchedSidebarCollapsed = useWatch({
    control: form.control,
    name: "sidebarCollapsed",
  });
  const watchedTelemetryConsent = useWatch({
    control: form.control,
    name: "telemetryConsent",
  });

  useEffect(() => {
    const parsed = AppSettingsSchema.safeParse({
      theme: watchedTheme,
      language: watchedLanguage,
      sidebarCollapsed: watchedSidebarCollapsed,
      telemetryConsent: watchedTelemetryConsent,
    });
    if (!parsed.success) {
      return;
    }

    const settings = parsed.data;
    const state = useSettingsStore.getState();
    state.setTheme(settings.theme);
    state.setLanguage(settings.language);
    state.setSidebarCollapsed(settings.sidebarCollapsed);
    state.setTelemetryConsent(settings.telemetryConsent);
    applyTheme(settings.theme);
  }, [
    watchedTheme,
    watchedLanguage,
    watchedSidebarCollapsed,
    watchedTelemetryConsent,
  ]);

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.description")}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("theme.label")}</legend>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-checked:border-primary has-checked:bg-accent"
              >
                <input
                  type="radio"
                  value={value}
                  className="accent-primary"
                  {...form.register("theme")}
                />
                {t(`theme.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="language" className="text-sm font-medium">
            {t("settings.language")}
          </label>
          <select
            id="language"
            className="h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
            {...form.register("language")}
          >
            <option value="en">{t("settings.languageEnglish")}</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            {...form.register("sidebarCollapsed")}
          />
          {t("settings.sidebarCollapsed")}
        </label>
      </div>
    </section>
  );
}
