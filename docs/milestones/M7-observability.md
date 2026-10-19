# M7: Observability & Consent

**Goal:** Crash reporting, analytics, and logs, all consent-aware and behind ports.
**Prereqs:** M6 PASS.

## Tasks
- [ ] 7.1 `SentryErrorReporter` adapter for `ErrorReporterPort` (`captureException`, `setUser`, `addBreadcrumb`). JS SDK in frontend; `sentry` Rust crate in `src-tauri` for native panics. Release tag = app version; environment from config. Source map upload step in build (CI only, token from env).
- [ ] 7.2 Scrubbing: `beforeSend` removes emails, tokens, file paths containing the OS username, request bodies. Test proves redaction.
- [ ] 7.3 `PostHogAnalytics` adapter for `AnalyticsPort` (`identify`, `track`, `page`, `reset`). Autocapture OFF; explicit events only. Event names in a typed registry `AnalyticsEvents` (snake_case). No PII in properties.
- [ ] 7.4 Consent: first-run prompt (modal) with Accept / Decline. Stores `telemetryConsent` (`granted|denied|unset`) in settings (M1.5). Until `granted`: analytics adapter is noop; crash reporting is noop unless user opts in. Settings page toggle to change anytime; revoking calls `reset()` and stops sending immediately.
- [ ] 7.5 Wire page tracking from router `onResolved` in `app/` composition (not inside features). Identify/reset follow auth state like flags (M5.8).
- [ ] 7.6 Add tracked events: `app_opened`, `sign_in`, `sign_out`, `checkout_started`, `checkout_completed`, `flag_exposed` (once per flag per session).
- [ ] 7.7 Global handlers from M1.9 now also report to ErrorReporter. React ErrorBoundary reports with component stack.
- [ ] 7.8 "Report a problem" button in settings: bundles last log file (redacted) and opens a mailto/support URL prompt. User explicitly confirms what is sent.
- [ ] 7.9 Tests: consent gating (nothing sent when unset/denied), scrubbing, event registry typing.

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
_(agent fills)_

## Review
_(reviewer fills)_
