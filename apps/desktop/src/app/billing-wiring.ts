import { onSignOut, useAuthStore } from "@/features/auth";
import { useEntitlementStore } from "@/features/billing";

/**
 * Composition wiring: entitlement follows auth changes and window focus.
 * Sign-out clears the per-user signed snapshot.
 */
export function initializeBilling(): void {
  const userId = useAuthStore.getState().session?.user.id ?? null;
  void useEntitlementStore.getState().init(userId ?? undefined);

  let previousUser = userId;
  useAuthStore.subscribe((state) => {
    const next = state.session?.user.id ?? null;
    if (next === previousUser) {
      return;
    }
    previousUser = next;
    if (next) {
      void useEntitlementStore.getState().init(next);
    } else {
      void useEntitlementStore.getState().reset();
    }
  });

  onSignOut(() => useEntitlementStore.getState().reset());

  window.addEventListener("focus", () => {
    void useEntitlementStore.getState().refresh();
  });
}
