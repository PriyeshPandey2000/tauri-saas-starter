import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { commands } from "@/shared/ipc/bindings";

import { AppInfoFooter } from "./app-info-footer";
import { ReportProblem } from "./report-problem";
import { useSettingsStore } from "../settings-store";

export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const telemetryConsent = useSettingsStore((state) => state.telemetryConsent);
  const setTelemetryConsent = useSettingsStore(
    (state) => state.setTelemetryConsent,
  );
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const launchAtLogin = useSettingsStore((state) => state.launchAtLogin);
  const notificationsEnabled = useSettingsStore(
    (state) => state.notificationsEnabled,
  );
  const globalShortcut = useSettingsStore((state) => state.globalShortcut);
  const updateChannel = useSettingsStore((state) => state.updateChannel);
  const setCloseToTray = useSettingsStore((state) => state.setCloseToTray);
  const setLaunchAtLogin = useSettingsStore((state) => state.setLaunchAtLogin);
  const setNotificationsEnabled = useSettingsStore(
    (state) => state.setNotificationsEnabled,
  );
  const setGlobalShortcut = useSettingsStore(
    (state) => state.setGlobalShortcut,
  );
  const setUpdateChannel = useSettingsStore((state) => state.setUpdateChannel);
  const [updatesConfigured, setUpdatesConfigured] = useState(true);

  useEffect(() => {
    void commands
      .updaterConfigured()
      .then(setUpdatesConfigured)
      .catch(() => setUpdatesConfigured(false));
  }, []);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setSidebarCollapsed = useSettingsStore(
    (state) => state.setSidebarCollapsed,
  );

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
                  name="theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => setTheme(value)}
                  className="accent-primary"
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
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="en">{t("settings.languageEnglish")}</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sidebarCollapsed}
            onChange={(event) => setSidebarCollapsed(event.target.checked)}
            className="accent-primary"
          />
          {t("settings.sidebarCollapsed")}
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={telemetryConsent === "granted"}
            onChange={(event) =>
              setTelemetryConsent(event.target.checked ? "granted" : "denied")
            }
            className="mt-1 accent-primary"
          />
          <span>
            {t("settings.telemetry")}
            <span className="block text-xs text-muted-foreground">
              {t("settings.telemetryHint")}
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-3 border-t border-input pt-4">
          <h2 className="text-sm font-medium">{t("settings.nativeTitle")}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={closeToTray}
              onChange={(event) => setCloseToTray(event.target.checked)}
              className="accent-primary"
            />
            {t("settings.closeToTray")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={launchAtLogin}
              onChange={(event) => setLaunchAtLogin(event.target.checked)}
              className="accent-primary"
            />
            {t("settings.launchAtLogin")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(event) =>
                setNotificationsEnabled(event.target.checked)
              }
              className="accent-primary"
            />
            {t("settings.notifications")}
          </label>
          <label htmlFor="shortcut" className="flex flex-col gap-1 text-sm">
            {t("settings.shortcut")}
            <input
              id="shortcut"
              value={globalShortcut}
              onChange={(event) => setGlobalShortcut(event.target.value)}
              className="h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {t("settings.shortcutHint")}
            </span>
          </label>
          <label
            htmlFor="update-channel"
            className="flex flex-col gap-1 text-sm"
          >
            {t("settings.updateChannel")}
            <select
              id="update-channel"
              value={updateChannel}
              onChange={(event) =>
                setUpdateChannel(event.target.value as "stable" | "beta")
              }
              className="h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="stable">{t("settings.channelStable")}</option>
              <option value="beta">{t("settings.channelBeta")}</option>
            </select>
            {!updatesConfigured && (
              <span className="text-xs text-muted-foreground">
                {t("settings.updatesNotConfigured")}
              </span>
            )}
          </label>
        </div>

        <div className="flex flex-col gap-2 border-t border-input pt-4">
          <h2 className="text-sm font-medium">{t("settings.reportTitle")}</h2>
          <ReportProblem />
        </div>
      </div>

      <AppInfoFooter />
    </section>
  );
}
