import { Settings as SettingsIcon } from "lucide-react";

import { registerCommand } from "@/shared/lib/commands";
import { registerNavItem } from "@/shared/lib/nav";

import { useSettingsStore } from "./settings-store";

export { useSettingsStore } from "./settings-store";
export { SettingsPage } from "./components/settings-page";
export { ConsentPrompt } from "./components/consent-prompt";

registerNavItem({
  id: "settings",
  labelKey: "nav.settings",
  to: "/settings",
  icon: SettingsIcon,
  order: 20,
});

registerCommand({
  id: "theme.toggle",
  labelKey: "commands.toggleTheme",
  groupKey: "commands.groupTheme",
  keywords: ["dark", "light", "theme"],
  perform: () => {
    const state = useSettingsStore.getState();
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const current =
      state.theme === "system" ? (prefersDark ? "dark" : "light") : state.theme;
    state.setTheme(current === "dark" ? "light" : "dark");
  },
});
