import { commands } from "@/shared/ipc/bindings";

import { onSignOut, useAuthStore } from "@/features/auth";
import { useSettingsStore } from "@/features/settings";
import { ports } from "@/ports";
import type { AppRouter } from "./router";

let appOpenedTracked = false;

function consentGranted(): boolean {
  return useSettingsStore.getState().telemetryConsent === "granted";
}

async function setRustConsent(granted: boolean): Promise<void> {
  try {
    await commands.setTelemetryConsent(granted);
  } catch {
    // Native telemetry stays off if the command is unavailable.
  }
}

function identify(userId: string | null): void {
  ports.errorReporter.setUser(userId);
  if (userId && consentGranted()) {
    void ports.analytics.identify(userId);
  }
}

function trackAppOpened(): void {
  if (!consentGranted() || appOpenedTracked) {
    return;
  }
  appOpenedTracked = true;
  void ports.analytics.track("app_opened", {});
}

/**
 * Consent is the single gate for analytics and error reporting (JS and Rust).
 * Revoking stops sending immediately; nothing is sent before consent.
 */
export function initializeObservability(router: AppRouter): void {
  const granted = consentGranted();
  ports.analytics.setConsent(granted);
  ports.errorReporter.setConsent(granted);
  void setRustConsent(granted);

  const currentUser = useAuthStore.getState().session?.user.id ?? null;
  identify(currentUser);
  trackAppOpened();

  useSettingsStore.subscribe((state) => {
    const next = state.telemetryConsent === "granted";
    ports.analytics.setConsent(next);
    ports.errorReporter.setConsent(next);
    void setRustConsent(next);
    if (next) {
      identify(useAuthStore.getState().session?.user.id ?? null);
      trackAppOpened();
    } else {
      ports.errorReporter.setUser(null);
    }
  });

  let previousUser = currentUser;
  useAuthStore.subscribe((state) => {
    const next = state.session?.user.id ?? null;
    if (next === previousUser) {
      return;
    }
    previousUser = next;
    identify(next);
    if (!consentGranted()) {
      return;
    }
    if (next) {
      void ports.analytics.track("sign_in", {
        method: state.lastAuthMethod ?? "email",
      });
    } else {
      void ports.analytics.track("sign_out", {});
      void ports.analytics.reset();
    }
  });

  router.subscribe("onResolved", ({ toLocation }) => {
    if (consentGranted()) {
      void ports.analytics.page(toLocation.pathname);
    }
  });

  onSignOut(() => ports.analytics.reset());
}
