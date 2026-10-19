import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_SETTINGS,
  parseSettings,
  type AppSettings,
  type TelemetryConsent,
  type Theme,
} from "@app/shared";

import { settingsStorage } from "./settings-storage";

export type SettingsState = AppSettings & {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setTelemetryConsent: (consent: TelemetryConsent) => void;
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
      reset: () =>
        set({
          theme: DEFAULT_SETTINGS.theme,
          language: DEFAULT_SETTINGS.language,
          sidebarCollapsed: DEFAULT_SETTINGS.sidebarCollapsed,
          telemetryConsent: DEFAULT_SETTINGS.telemetryConsent,
        }),
    }),
    {
      name: "app-settings",
      storage: createJSONStorage(() => settingsStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        telemetryConsent: state.telemetryConsent,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...parseSettings(persisted),
      }),
    },
  ),
);
