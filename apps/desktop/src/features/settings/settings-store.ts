import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_SETTINGS,
  parseSettings,
  type AppSettings,
  type TelemetryConsent,
  type Theme,
} from "@app/shared";

import { settingsPersistStorage } from "./settings-storage";

export type SettingsState = AppSettings & {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setTelemetryConsent: (consent: TelemetryConsent) => void;
  setCloseToTray: (enabled: boolean) => void;
  setLaunchAtLogin: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setGlobalShortcut: (shortcut: string) => void;
  setUpdateChannel: (channel: "stable" | "beta") => void;
  reset: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setTelemetryConsent: (telemetryConsent) => set({ telemetryConsent }),
      setCloseToTray: (closeToTray) => set({ closeToTray }),
      setLaunchAtLogin: (launchAtLogin) => set({ launchAtLogin }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setGlobalShortcut: (globalShortcut) => set({ globalShortcut }),
      setUpdateChannel: (updateChannel) => set({ updateChannel }),
      reset: () =>
        set({
          theme: DEFAULT_SETTINGS.theme,
          language: DEFAULT_SETTINGS.language,
          sidebarCollapsed: DEFAULT_SETTINGS.sidebarCollapsed,
          telemetryConsent: DEFAULT_SETTINGS.telemetryConsent,
          closeToTray: DEFAULT_SETTINGS.closeToTray,
          launchAtLogin: DEFAULT_SETTINGS.launchAtLogin,
          notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
          globalShortcut: DEFAULT_SETTINGS.globalShortcut,
          updateChannel: DEFAULT_SETTINGS.updateChannel,
        }),
    }),
    {
      name: "app-settings",
      storage: settingsPersistStorage,
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        telemetryConsent: state.telemetryConsent,
        closeToTray: state.closeToTray,
        launchAtLogin: state.launchAtLogin,
        notificationsEnabled: state.notificationsEnabled,
        globalShortcut: state.globalShortcut,
        updateChannel: state.updateChannel,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...parseSettings(persisted),
      }),
    },
  ),
);
