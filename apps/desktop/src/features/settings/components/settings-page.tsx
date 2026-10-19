import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AppSettingsSchema,
  type AppSettings,
  type AppSettingsInput,
} from "@app/shared";
import { Button } from "@/shared/ui/button";
import { applyTheme } from "@/shared/lib/theme";

import { useSettingsStore } from "../settings-store";

export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const telemetryConsent = useSettingsStore((state) => state.telemetryConsent);

  const form = useForm<AppSettingsInput, unknown, AppSettings>({
    resolver: zodResolver(AppSettingsSchema),
    defaultValues: { theme, language, sidebarCollapsed, telemetryConsent },
  });

  const watchedTheme = useWatch({ control: form.control, name: "theme" });

  useEffect(() => {
    if (watchedTheme) {
      applyTheme(watchedTheme);
    }
  }, [watchedTheme]);

  const onSubmit = form.handleSubmit((values) => {
    const state = useSettingsStore.getState();
    state.setTheme(values.theme);
    state.setLanguage(values.language);
    state.setSidebarCollapsed(values.sidebarCollapsed);
    state.setTelemetryConsent(values.telemetryConsent);
    toast.success(t("settings.saved"));
  });

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.description")}
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
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

        <div>
          <Button type="submit">{t("settings.title")}</Button>
        </div>
      </form>
    </section>
  );
}
