import { useEffect } from "react";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

import { BILLING_SUCCESS_URL } from "@/shared/lib/app-links";
import { useEntitlementStore } from "../entitlement-store";

/**
 * `tauri-saas-starter://billing/success` (no parameters, no authority) only
 * triggers a refetch; the server remains the source of truth.
 */
export function BillingDeepLinkBridge() {
  useEffect(() => {
    const dispatch = (urls: string[] | null) => {
      if (!urls?.includes(BILLING_SUCCESS_URL)) {
        return;
      }
      const store = useEntitlementStore.getState();
      void store.refresh();
      store.startPolling();
    };

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void getCurrent()
      .then((urls) => {
        dispatch(urls);
        return onOpenUrl(dispatch);
      })
      .then((stop) => {
        if (cancelled) {
          stop();
        } else {
          unlisten = stop;
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return null;
}
