const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * Build the production/dev webview CSP. PostHog is only reachable when the
 * project key is configured, so the origin is not opened needlessly.
 */
export function buildCsp({ apiUrl, posthogKey, posthogHost, isDev }) {
  const apiOrigin = new URL(apiUrl).origin;
  const connectSrc = ["'self'", apiOrigin];

  if (posthogKey) {
    connectSrc.push(new URL(posthogHost || DEFAULT_POSTHOG_HOST).origin);
  }
  if (isDev) {
    connectSrc.push("http://localhost:1420", "ws://localhost:1420");
  }

  return [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
  ].join("; ");
}
