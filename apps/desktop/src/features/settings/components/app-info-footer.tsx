import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { commands, type AppInfo } from "@/shared/ipc/bindings";

export function AppInfoFooter() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }
    let cancelled = false;
    void commands
      .getAppInfo()
      .then((value) => {
        if (!cancelled) {
          setInfo(value);
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to read app info", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) {
    return null;
  }

  return (
    <footer className="text-xs text-muted-foreground">
      {t("settings.appInfo", {
        version: info.version,
        os: info.os,
        arch: info.arch,
      })}
    </footer>
  );
}
