import { listen } from "@tauri-apps/api/event";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { toast } from "sonner";

import { useSettingsStore } from "@/features/settings";
import i18n from "@/shared/i18n";
import { ports } from "@/ports";

import type { AppRouter } from "./router";

let registeredShortcut: string | null = null;

export async function notify(title: string, body: string): Promise<void> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) {
      sendNotification({ title, body });
    }
  } catch (error) {
    console.warn("[notifications]", error);
  }
}

function reportShortcutError(error: unknown): void {
  console.warn(
    "[shortcut]",
    error instanceof Error ? error.message : String(error),
  );
  ports.errorReporter.captureException(error, {
    tags: { source: "global-shortcut" },
  });
}

async function applyShortcut(accel: string): Promise<void> {
  try {
    await unregisterAll();
    registeredShortcut = null;
    if (!accel.trim()) {
      return;
    }
    await register(accel, () => {
      void toggleWindow().catch(reportShortcutError);
    });
    registeredShortcut = accel;
  } catch (error) {
    registeredShortcut = null;
    const message = error instanceof Error ? error.message : String(error);
    if (/already|conflict|in use|registered/i.test(message)) {
      toast.error(i18n.t("native.shortcutConflict", { shortcut: accel }));
    }
    reportShortcutError(error);
  }
}

async function toggleWindow(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const window = getCurrentWindow();
  if (await window.isVisible()) {
    await window.hide();
  } else {
    await window.show();
    await window.setFocus();
  }
}

async function applyAutostart(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await enable();
    } else {
      await disable();
    }
  } catch (error) {
    ports.errorReporter.captureException(error, {
      tags: { source: "autostart" },
    });
  }
}

/** Wires tray/menu events, the global shortcut, autostart and notifications. */
export function initializeNative(router: AppRouter): () => void {
  const cleanups: (() => void)[] = [];

  let lastLaunchAtLogin = useSettingsStore.getState().launchAtLogin;
  let lastNotifications = useSettingsStore.getState().notificationsEnabled;
  const stopSettings = useSettingsStore.subscribe((state) => {
    if (state.globalShortcut !== registeredShortcut) {
      void applyShortcut(state.globalShortcut);
    }
    if (state.launchAtLogin !== lastLaunchAtLogin) {
      lastLaunchAtLogin = state.launchAtLogin;
      void applyAutostart(state.launchAtLogin);
    }
    if (state.notificationsEnabled && !lastNotifications) {
      lastNotifications = true;
      void notify(
        i18n.t("native.notificationsTitle"),
        i18n.t("native.notificationsBody"),
      );
    }
    if (!state.notificationsEnabled) {
      lastNotifications = false;
    }
  });
  cleanups.push(stopSettings);

  void applyShortcut(useSettingsStore.getState().globalShortcut);
  void applyAutostart(useSettingsStore.getState().launchAtLogin);
  if (useSettingsStore.getState().notificationsEnabled) {
    void notify(
      i18n.t("native.notificationsTitle"),
      i18n.t("native.notificationsBody"),
    );
  }

  void listen("native://open-settings", () => {
    void router.navigate({ to: "/settings" });
  })
    .then((stop) => cleanups.push(stop))
    .catch(reportShortcutError);

  void listen("native://check-updates", () => {
    void import("./updater").then(({ checkForUpdates }) => checkForUpdates());
  })
    .then((stop) => cleanups.push(stop))
    .catch(reportShortcutError);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
