import { isTauri } from "@tauri-apps/api/core";

export async function showMainWindow(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().show();
  } catch (error) {
    console.warn("Failed to show the main window", error);
  }
}
