/**
 * Deep-link scheme. Single source for desktop code; keep in sync with
 * `src-tauri/tauri.conf.json` (`plugins.deep-link.desktop.schemes`) and the API's
 * `APP_DEEP_LINK_SCHEME`. The M10 rename script updates all three.
 */
export const APP_SCHEME = "tauri-saas-starter";
export const AUTH_CALLBACK_URL = `${APP_SCHEME}://auth/callback`;
/** Parameterless by design: it only tells the app to refetch the entitlement. */
export const BILLING_SUCCESS_URL = `${APP_SCHEME}://billing/success`;
