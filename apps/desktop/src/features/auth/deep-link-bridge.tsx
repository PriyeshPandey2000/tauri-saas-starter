import { useEffect } from "react";

import { listenForAuthDeepLinks } from "./deep-link";
import { useAuthStore } from "./store";

/** Receives `tauri-saas-starter://auth/callback` while the app is running or at launch. */
export function DeepLinkBridge() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenForAuthDeepLinks(async (url) => {
      try {
        await useAuthStore.getState().completeOAuth(url);
      } catch {
        // The store carries the user-facing error.
      }
    }).then((stop) => {
      if (cancelled) {
        stop();
      } else {
        unlisten = stop;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return null;
}
