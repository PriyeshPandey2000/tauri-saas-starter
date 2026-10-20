# M7: Observability & Consent

**Goal:** Crash reporting, analytics, and logs, all consent-aware and behind ports.
**Prereqs:** M6 PASS.

## Tasks

- [x] 7.1 `SentryErrorReporter` adapter for `ErrorReporterPort` (`captureException`, `setUser`, `addBreadcrumb`). JS SDK in frontend; `sentry` Rust crate in `src-tauri` for native panics. Release tag = app version; environment from config. Source map upload step in build (CI only, token from env).
- [x] 7.2 Scrubbing: `beforeSend` removes emails, tokens, file paths containing the OS username, request bodies. Test proves redaction.
- [x] 7.3 `PostHogAnalytics` adapter for `AnalyticsPort` (`identify`, `track`, `page`, `reset`). Autocapture OFF; explicit events only. Event names in a typed registry `AnalyticsEvents` (snake_case). No PII in properties.
- [x] 7.4 Consent: first-run prompt (modal) with Accept / Decline. Stores `telemetryConsent` (`granted|denied|unset`) in settings (M1.5). Until `granted`: analytics adapter is noop; crash reporting is noop unless user opts in. Settings page toggle to change anytime; revoking calls `reset()` and stops sending immediately.
- [x] 7.5 Wire page tracking from router `onResolved` in `app/` composition (not inside features). Identify/reset follow auth state like flags (M5.8).
- [x] 7.6 Add tracked events: `app_opened`, `sign_in`, `sign_out`, `checkout_started`, `checkout_completed`, `flag_exposed` (once per flag per session).
- [x] 7.7 Global handlers from M1.9 now also report to ErrorReporter. React ErrorBoundary reports with component stack.
- [x] 7.8 "Report a problem" button in settings: bundles last log file (redacted) and opens a mailto/support URL prompt. User explicitly confirms what is sent.
- [x] 7.9 Tests: consent gating (nothing sent when unset/denied), scrubbing, event registry typing.

## Acceptance criteria

- Fresh install: no network calls to Sentry/PostHog before consent (verify via devtools network tab; paste evidence).
- After accept: events appear in PostHog, a test exception appears in Sentry with scrubbed data.
- Revoke consent: events stop immediately.
- A forced Rust panic reaches Sentry (dev check).
- Tests, lint, typecheck green.

## Out of scope

Session replay, performance tracing, log shipping to cloud.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test
```

## Review checklist

- [ ] Consent honored everywhere, default is off.
- [ ] No PII in events or crash payloads.
- [ ] Vendor SDKs only in adapters.
- [ ] Autocapture disabled.

## Agent report

**Status: complete for M7.1-M7.9 (2026-10-20). Awaiting review.**

### What shipped

- **7.1/7.2 Error reporting.** `SentryErrorReporter` adapter (`@sentry/react@11.8.0`)
  initialized only after consent; release `VITE_APP_VERSION`, environment
  `VITE_APP_ENV`, opaque user id. JS `beforeSend`/`beforeBreadcrumb` scrub via
  `shared/lib/scrub.ts`. Rust `sentry@0.49.3` in `src-tauri` with a consent
  `AtomicBool`, settings-file read at startup, `before_send` gate, panic hook
  from `sentry::init`, and regex scrubbing. Forced panic command is
  `#[cfg(debug_assertions)]` only.
- **7.3 Analytics.** PostHog REST `/i/v0/e/` adapter (no `posthog-js`), typed
  `ANALYTICS_EVENTS` registry with Zod validation, no autocapture.
- **7.4 Consent.** First-run non-blocking card, settings toggle, Rust command.
  Default `unset`; decline/revoke send nothing and close the JS client.
- **7.5 Wiring.** App-level router `onResolved` page tracking, identify/reset on
  auth changes, `app_opened`, sign-in/out events.
- **7.6 Events.** `app_opened`, `sign_in`, `sign_out`, `checkout_started`,
  `checkout_completed`, `flag_exposed` (once per flag per session).
- **7.7 Error paths.** Global handlers and `ErrorBoundary` report through the
  port with component stack + source tags; identical errors are rate-limited
  (3/min per message, 20/min total).
- **7.8 Report a problem.** Settings previews the last log tail (Rust reads and
  scrubs it; JS scrubs again) and requires an explicit confirm before opening
  the support email/URL from env.
- **7.9 Tests.** JS/Rust consent gating, scrubbing (positive and negative),
  registry validation, CSP builder (Sentry + PostHog), dedupe, ErrorBoundary
  reporting, analytics revoke.

Source-map upload is documented for CI in `docs/observability.md`; nothing was
uploaded from this machine.

### Verification (real output)

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  34 passed (34)
desktop:test:       Tests  124 passed (124)
api:test:  Test Files  11 passed (11)
api:test:       Tests  51 passed (51)
 Tasks:    2 successful, 2 total

$ cd apps/desktop/src-tauri && cargo test
running 7 tests
test result: ok. 6 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

$ pnpm --filter desktop verify:bundle-secrets
No billing secrets in the desktop bundle
```

### Not run (user-gated)

- Real Sentry DSN events and a forced panic reaching Sentry: no test DSN was
  provided; local scrub/consent tests and the debug panic command are in place.
- Source-map symbolication and CI upload (M9).
- Real PostHog events after consent.
- Built-app devtools network check proving zero calls before consent.

## Review

_(reviewer fills)_
