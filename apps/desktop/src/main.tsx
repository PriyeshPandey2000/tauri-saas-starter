import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers";
import { onSignOut, useAuthStore } from "@/features/auth";
import { ConfigErrorScreen } from "@/app/ConfigErrorScreen";
import { createAppQueryClient } from "@/app/query-client";
import {
  clearQueryCache,
  clearQueryCacheOnUserChange,
  persistQueryCache,
  restoreQueryCache,
} from "@/app/query-persistence";
import { initializeBilling } from "@/app/billing-wiring";
import { initializeObservability } from "@/app/analytics-wiring";
import { initializeFeatureFlags } from "@/app/feature-flags-wiring";
import { createAppRouter } from "@/app/router";
import { Splash } from "@/app/Splash";
import { useSettingsStore } from "@/features/settings";
import { logger, ports } from "@/ports";
import { ConfigError, getConfig } from "@/shared/lib/config";
import { useDatabaseStore } from "@/shared/lib/db-status";
import { applyTheme } from "@/shared/lib/theme";
import { applyWindowTheme, showMainWindow } from "@/shared/lib/window";

import "@/shared/i18n";
import "./index.css";

function registerGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    logger.error("window.onerror", { error: event.error ?? event.message });
    void ports.errorReporter.captureException(event.error ?? event.message, {
      tags: { source: "window.onerror" },
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("unhandledrejection", { reason: event.reason });
    void ports.errorReporter.captureException(event.reason, {
      tags: { source: "unhandledrejection" },
    });
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

  try {
    getConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      root.render(
        <StrictMode>
          <ConfigErrorScreen issues={error.issues} />
        </StrictMode>,
      );
      await showMainWindow();
      return;
    }
    throw error;
  }

  const showTimer = window.setTimeout(() => {
    void showMainWindow();
  }, 4000);

  await loadSettings();
  applyTheme(useSettingsStore.getState().theme);
  await applyWindowTheme(useSettingsStore.getState().theme);
  registerGlobalErrorHandlers();
  initializeFeatureFlags();
  initializeBilling();

  const queryClient = createAppQueryClient();
  await restoreQueryCache(queryClient);
  persistQueryCache(queryClient);
  onSignOut(() => queryClient.clear());
  clearQueryCacheOnUserChange(queryClient, (listener) => {
    listener(useAuthStore.getState().session?.user.id ?? null);
    return useAuthStore.subscribe((state) => {
      listener(state.session?.user.id ?? null);
    });
  });
  onSignOut(() => void clearQueryCache());
  onSignOut(() => {
    void ports.database.close();
    useDatabaseStore.getState().reset();
  });
  const router = createAppRouter(queryClient);
  initializeObservability(router);

  root.render(
    <StrictMode>
      <AppProviders router={router} queryClient={queryClient} />
    </StrictMode>,
  );

  window.clearTimeout(showTimer);
  await showMainWindow();
}

void bootstrap();
