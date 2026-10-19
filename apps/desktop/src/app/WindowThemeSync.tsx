import { useEffect } from "react";

import { useSettingsStore } from "@/features/settings";
import { applyWindowTheme } from "@/shared/lib/window";

export function WindowThemeSync() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    void applyWindowTheme(theme);
  }, [theme]);

  return null;
}
