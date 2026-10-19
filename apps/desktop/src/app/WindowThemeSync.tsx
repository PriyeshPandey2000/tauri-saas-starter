import { useEffect } from "react";

import { useSettingsStore } from "@/features/settings";
import { usePorts } from "@/ports";
import { applyWindowTheme } from "@/shared/lib/window";

export function WindowThemeSync() {
  const theme = useSettingsStore((state) => state.theme);
  const { logger } = usePorts();

  useEffect(() => {
    logger.info("theme.changed", { theme });
    void applyWindowTheme(theme);
  }, [logger, theme]);

  return null;
}
