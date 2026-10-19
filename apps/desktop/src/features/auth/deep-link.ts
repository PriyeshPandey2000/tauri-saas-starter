import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

import { AUTH_CALLBACK_URL } from "@/shared/lib/app-links";

export function isAuthCallback(url: string): boolean {
  return url.startsWith(`${AUTH_CALLBACK_URL}?`);
}

/**
 * Delivers the OAuth callback(s) that launched or reached the app.
 * Returns an unlisten function. Non-auth URLs are ignored.
 */
export async function listenForAuthDeepLinks(
  handler: (url: string) => Promise<void> | void,
): Promise<() => void> {
  const dispatch = async (urls: string[]): Promise<void> => {
    for (const url of urls) {
      if (isAuthCallback(url)) {
        await handler(url);
      }
    }
  };

  const current = await getCurrent();
  if (current) {
    await dispatch(current);
  }

  return onOpenUrl((urls) => {
    void dispatch(urls);
  });
}
