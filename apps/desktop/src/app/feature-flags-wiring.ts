import { onSignOut, useAuthStore } from "@/features/auth";
import { useSettingsStore } from "@/features/settings";
import { ports } from "@/ports";

/**
 * Composition wiring for flags. Kept out of the auth and settings features so
 * they stay isolated: flags follow auth changes and telemetry consent here.
 */
export function initializeFeatureFlags(): void {
  const userId = useAuthStore.getState().session?.user.id ?? null;
  const consent = useSettingsStore.getState().telemetryConsent === "granted";

  ports.featureFlags.setConsent(consent);
  void ports.featureFlags.init(userId ?? undefined);

  let previousUser = userId;
  useAuthStore.subscribe((state) => {
    const next = state.session?.user.id ?? null;
    if (next === previousUser) {
      return;
    }
    previousUser = next;
    if (next) {
      void ports.featureFlags.init(next);
    } else {
      void ports.featureFlags.reset();
    }
  });

  useSettingsStore.subscribe((state) => {
    ports.featureFlags.setConsent(state.telemetryConsent === "granted");
  });

  onSignOut(() => ports.featureFlags.reset());
}
