# Observability and consent

Sentry (crash reports) and PostHog (product analytics) are gated by
`settings.telemetryConsent`. The default is `unset`; nothing is sent until the
user selects **Accept**. Declining or revoking sends nothing and stops the
clients immediately.

## What is sent

By default, even anonymous flag evaluation does **not** contact PostHog:
`VITE_FLAGS_REQUIRE_CONSENT` defaults to `true`. Kill switches therefore reach
only users who consented (or builds that explicitly set the env to `false`).

After consent:

- Sentry: exceptions and React error boundaries, with release (`VITE_APP_VERSION`),
  environment (`VITE_APP_ENV`) and an opaque auth user id.
- PostHog: the typed events in `packages/shared/src/analytics.ts`
  (`app_opened`, `sign_in`, `sign_out`, `checkout_started`,
  `checkout_completed`, `flag_exposed`) plus `$pageview` from the router.

Never sent: emails, tokens, auth/cookie headers, request/response bodies,
query strings with secrets, the install id, session replay, performance traces,
or the user's home path. Scrubbing runs in JS (`beforeSend`, shared
`scrubText`) and in Rust (`before_send`) with unit tests.

The first-run card is deliberately non-blocking: the user can sign in and keep
using the app. Settings has a consent toggle and a "Report a problem" flow that
shows the exact redacted log preview before an explicit confirmation.

## Sentry project settings

In the Sentry project settings, enable **Prevent Storing of IP Addresses** and
configure server-side data scrubbing in addition to the client `beforeSend`
scrubber. The Rust DSN is a build-time environment value (`SENTRY_DSN` via
`option_env!`), not a runtime setting and never committed.

## Environment

Desktop (build-time Vite values):

- `VITE_SENTRY_DSN` — Sentry project DSN. Missing means Sentry stays off.
- `VITE_APP_VERSION`, `VITE_APP_ENV` — release/environment tags.
- `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` — analytics (same REST approach as
  flags; no `posthog-js`).
- `VITE_SUPPORT_EMAIL` or `VITE_SUPPORT_URL` — report destination.

Rust (build-time `option_env!`):

- `SENTRY_DSN` — set it when building, e.g.
  `SENTRY_DSN=... SENTRY_ENVIRONMENT=dev pnpm tauri build`.
- `SENTRY_ENVIRONMENT` — optional environment tag.

`sentry-panic` captures the event and calls `client.flush(None)` inside its panic
handler before forwarding to the previous hook, so a release build with
`panic = "abort"` still attempts delivery during the panic hook. Confirm this
with a release-build forced panic (see deferred checks).

The Rust client reads `settings.json` at startup so a boot panic respects the
stored consent. Consent changes reach Rust through the typed
`set_telemetry_consent` command. `sentry::init` installs the panic hook; the
forced panic command exists only in debug builds (`pnpm tauri dev`).

## Source maps (CI only, M9)

Do not upload from a developer machine. In CI:

1. Store `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` as CI secrets.
2. Build with `@sentry/vite-plugin` (or `sentry-cli sourcemaps upload`) after
   Vite emits maps, using `SENTRY_AUTH_TOKEN` from the environment.
3. Keep maps out of the shipped bundle; upload then delete them.
4. Rust symbolication uses the same project/release; upload debug files from the
   CI build artifact when native crash reporting is enabled.

CI wiring itself lands in M9.

## Analytics transport

PostHog REST `POST {host}/i/v0/e/` with `{ api_key, event, distinct_id }`.
Autocapture is impossible: only the typed registry sends events, and
`parseAnalyticsProperties` rejects unknown properties. Identify uses the auth
user id; reset clears it on sign-out or consent revocation.

## Safety

No MCP server, CLI login, browser session or saved credential is used for
Sentry or PostHog. DSNs/tokens come only from env files the user fills in; the
pre-commit guard rejects Sentry auth tokens and DSNs. See also
`docs/deferred-checks.md`.

## References

- Sentry React guide: https://docs.sentry.io/platforms/javascript/guides/react/
- Sentry Rust guide: https://docs.sentry.io/platforms/rust/
- Sentry data collection: https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
- PostHog capture API: https://posthog.com/docs/api/capture
