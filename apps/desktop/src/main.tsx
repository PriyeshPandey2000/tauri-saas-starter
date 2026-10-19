import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers";
import { createAppQueryClient } from "@/app/query-client";
import { createAppRouter } from "@/app/router";
import { Splash } from "@/app/Splash";
import { useSettingsStore } from "@/features/settings";
import { applyTheme } from "@/shared/lib/theme";
import { applyWindowTheme, showMainWindow } from "@/shared/lib/window";

import "@/shared/i18n";
import "./index.css";

function registerGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    console.error("window.onerror", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("unhandledrejection", event.reason);
  });
}

async function loadSettings(): Promise<void> {
  try {
    await useSettingsStore.persist.rehydrate();
  } catch (error) {
    console.warn("Failed to load saved settings; using defaults", error);
  }
}

async function bootstrap(): Promise<void> {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root element #root not found");
  }

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Splash />
    </StrictMode>,
  );

  const showTimer = window.setTimeout(() => {
    void showMainWindow();
  }, 4000);

  await loadSettings();
  applyTheme(useSettingsStore.getState().theme);
  await applyWindowTheme(useSettingsStore.getState().theme);
  registerGlobalErrorHandlers();

  const queryClient = createAppQueryClient();
  const router = createAppRouter(queryClient);

  root.render(
    <StrictMode>
      <AppProviders router={router} queryClient={queryClient} />
    </StrictMode>,
  );

  window.clearTimeout(showTimer);
  await showMainWindow();
}

void bootstrap();
