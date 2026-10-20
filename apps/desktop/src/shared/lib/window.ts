import { isTauri } from "@tauri-apps/api/core";

import type { Theme } from "@app/shared";

export async function showMainWindow(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const window = getCurrentWindow();
    await window.show();
    console.info("[window] shown", { visible: await window.isVisible() });
  } catch (error) {
    console.warn("Failed to show the main window", error);
  }
}

export async function applyWindowTheme(theme: Theme): Promise<void> {
  if (!isTauri()) {
    return;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setTheme(theme === "system" ? null : theme);
  } catch (error) {
    console.warn("Failed to apply the window theme", error);
  }
}
