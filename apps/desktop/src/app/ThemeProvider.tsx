import { useEffect, type ReactNode } from "react";

import { applyTheme, subscribeToSystemTheme } from "@/shared/lib/theme";
import { useSettingsStore } from "@/features/settings";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") {
      return;
    }
    return subscribeToSystemTheme(() => applyTheme("system"));
  }, [theme]);

  return <>{children}</>;
}
