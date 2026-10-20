# Manual checks register

Single source of truth for checks that need a human, a display, or real
credentials. Automated gates live in the milestone reports. **Status is
`Not run` unless a human reports a result; the agent never marks a check
`Passed`.** Append every manual run to the Results log.

## Summary

| Check                                                                                                 | Milestone | Status  | Last run   | OS and build     | Result and notes                                                   |
| ----------------------------------------------------------------------------------------------------- | --------- | ------- | ---------- | ---------------- | ------------------------------------------------------------------ |
| [M1-01 Window, theme, native menu](#m1-01-window-theme-native-menu)                                   | M1        | Not run | —          | —                | —                                                                  |
| [M1-02 Title bar follows app theme](#m1-02-title-bar-follows-app-theme)                               | M1        | Passed  | 2026-10-19 | macOS, tauri dev | Confirmed by the user: dark/light title bar follows the app theme. |
| [M1-03 Corrupt settings file starts with defaults](#m1-03-corrupt-settings-file-starts-with-defaults) | M1        | Not run | 2026-10-20 | macOS, tauri dev | Observed by agent in tauri dev, not independently confirmed.       |
| [M1-04 Log file created](#m1-04-log-file-created)                                                     | M1        | Not run | 2026-10-20 | macOS, tauri dev | Observed by agent in tauri dev, not independently confirmed.       |
| [M1-05 2 MB log rotation](#m1-05-2-mb-log-rotation)                                                   | M1, M10   | Not run | —          | —                | —                                                                  |
| [M1-06 Screenshot checks](#m1-06-screenshot-checks)                                                   | M1        | Not run | —          | —                | Needs Screen Recording permission for the terminal.                |
| [M3-01 Google OAuth round-trip](#m3-01-google-oauth-round-trip)                                       | M3, M4    | Not run | —          | —                | —                                                                  |
| [M3-02 Windows webview origin](#m3-02-windows-webview-origin)                                         | M3        | Not run | —          | —                | —                                                                  |
| [M3-03 Real keychain round-trip](#m3-03-real-keychain-round-trip)                                     | M3        | Not run | —          | —                | —                                                                  |
| [M3-04 Compose Postgres port clash](#m3-04-compose-postgres-port-clash)                               | M3, M4    | Not run | —          | —                | —                                                                  |
| [M4-01 Per-user database isolation](#m4-01-per-user-database-isolation)                               | M4        | Not run | —          | —                | —                                                                  |
| [M4-02 Relaunch does not re-run migrations](#m4-02-relaunch-does-not-re-run-migrations)               | M4        | Not run | —          | —                | —                                                                  |
| [M4-03 10,000-note scrolling](#m4-03-10000-note-scrolling)                                            | M4        | Not run | —          | —                | Automated DOM-count proxy exists; feel needs a built app.          |
| [M4-04 Offline notes and mutation errors](#m4-04-offline-notes-and-mutation-errors)                   | M4        | Not run | —          | —                | —                                                                  |
| [M4-05 Sign-out closes the local database](#m4-05-sign-out-closes-the-local-database)                 | M4        | Not run | —          | —                | —                                                                  |
| [M4-06 Migration failure error screen](#m4-06-migration-failure-error-screen)                         | M4        | Not run | —          | —                | —                                                                  |
| [M4-07 Lost session does not leak notes](#m4-07-lost-session-does-not-leak-notes)                     | M4        | Not run | —          | —                | —                                                                  |
| [M5-01 Remote flag values replace defaults](#m5-01-remote-flag-values-replace-defaults)               | M5        | Not run | —          | —                | —                                                                  |
| [M5-02 Dashboard toggle and variant](#m5-02-dashboard-toggle-and-variant)                             | M5        | Not run | —          | —                | —                                                                  |
| [M5-03 Offline flag cache then defaults](#m5-03-offline-flag-cache-then-defaults)                     | M5        | Not run | —          | —                | —                                                                  |
| [M5-04 Consent-based identify/revoke](#m5-04-consent-based-identify-revoke)                           | M5        | Not run | —          | —                | —                                                                  |
| [M5-05 Dev overrides and production block](#m5-05-dev-overrides-and-production-block)                 | M5        | Not run | —          | —                | —                                                                  |
| [M5-06 CSP allows PostHog in a built app](#m5-06-csp-allows-posthog-in-a-built-app)                   | M5        | Not run | —          | —                | —                                                                  |
| [M5-07 Dashboard change reaches built app](#m5-07-dashboard-change-reaches-built-app)                 | M5        | Not run | —          | —                | —                                                                  |
| [M6-01 Test-mode checkout flips the plan](#m6-01-test-mode-checkout-flips-the-plan)                   | M6        | Not run | —          | —                | Needs test keys in `apps/api/.env`.                                |
| [M6-02 Webhook tunnel and replay](#m6-02-webhook-tunnel-and-replay)                                   | M6        | Not run | —          | —                | Needs a user-set-up tunnel.                                        |
| [M6-03 Customer portal](#m6-03-customer-portal)                                                       | M6        | Not run | —          | —                | —                                                                  |
| [M6-04 Cancellation timing](#m6-04-cancellation-timing)                                               | M6        | Not run | —          | —                | Verify in test mode.                                               |
| [M6-05 Metadata and return parameters](#m6-05-metadata-and-return-parameters)                         | M6        | Not run | —          | —                | Verify in test mode.                                               |
| [M6-06 Past-due banner and grace](#m6-06-past-due-banner-and-grace)                                   | M6        | Not run | —          | —                | —                                                                  |
| [M6-07 Account deletion blocked](#m6-07-account-deletion-blocked)                                     | M6        | Not run | —          | —                | —                                                                  |
| [M7-01 Scrubbed error reaches Sentry](#m7-01-scrubbed-error-reaches-sentry)                           | M7        | Not run | —          | —                | Needs a real DSN.                                                  |
| [M7-02 Release panic reaches Sentry](#m7-02-release-panic-reaches-sentry)                             | M7        | Not run | —          | —                | Needs a release build with `SENTRY_DSN`.                           |
| [M7-03 Source-map symbolication](#m7-03-source-map-symbolication)                                     | M7, M9    | Not run | —          | —                | CI upload step lands in M9.                                        |
| [M7-04 PostHog events after consent](#m7-04-posthog-events-after-consent)                             | M7        | Not run | —          | —                | —                                                                  |
| [M7-05 Zero network before consent](#m7-05-zero-network-before-consent)                               | M7        | Not run | —          | —                | Check devtools in a built app.                                     |
| [M7-06 Consent UI and log preview](#m7-06-consent-ui-and-log-preview)                                 | M7        | Not run | —          | —                | —                                                                  |
| [M8-01 Tray icon and menu](#m8-01-tray-icon-and-menu)                                                 | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-02 Close-to-tray off quits](#m8-02-close-to-tray-off-quits)                                       | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-03 Close-to-tray on stays resident](#m8-03-close-to-tray-on-stays-resident)                       | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-04 macOS dock behavior](#m8-04-macos-dock-behavior)                                               | M8        | Not run | —          | —                | Built app, macOS.                                                  |
| [M8-05 Global shortcut default](#m8-05-global-shortcut-default)                                       | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-06 Global shortcut changed](#m8-06-global-shortcut-changed)                                       | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-07 Shortcut conflict toast](#m8-07-shortcut-conflict-toast)                                       | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-08 Shortcut disabled](#m8-08-shortcut-disabled)                                                   | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-09 Single instance focuses the window](#m8-09-single-instance-focuses-the-window)                 | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-10 Single instance forwards a deep link](#m8-10-single-instance-forwards-a-deep-link)             | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-11 Cold-start deep link](#m8-11-cold-start-deep-link)                                             | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-12 Warm-start deep link](#m8-12-warm-start-deep-link)                                             | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-13 Unknown deep link ignored](#m8-13-unknown-deep-link-ignored)                                   | M8        | Not run | —          | —                | Built app; no navigation or command.                               |
| [M8-14 Notifications permission](#m8-14-notifications-permission)                                     | M8        | Not run | —          | —                | Built app, macOS.                                                  |
| [M8-15 Launch at login](#m8-15-launch-at-login)                                                       | M8        | Not run | —          | —                | Built app.                                                         |
| [M8-16 Signed update N to N+1](#m8-16-signed-update-n-to-n1)                                          | M8        | Not run | —          | —                | Needs a feed and signing key.                                      |
| [M8-17 Updater failure resilience](#m8-17-updater-failure-resilience)                                 | M8        | Not run | —          | —                | Bad signature or offline feed.                                     |
| [M8-18 Beta channel flag gate](#m8-18-beta-channel-flag-gate)                                         | M8        | Not run | —          | —                | Needs the `betaUpdates` flag.                                      |
| [M8-19 Windows native parity](#m8-19-windows-native-parity)                                           | M8        | Not run | —          | —                | Tray, shortcut, single instance, update.                           |

## Checks

### M1-01 Window, theme, native menu

1. Launch the app, confirm the window size, theme switching, and the native menu.

### M1-02 Title bar follows app theme

1. Switch the app theme; the native title bar follows dark/light.
   **Passed by the user** on macOS, tauri dev, 2026-10-19.

### M1-03 Corrupt settings file starts with defaults

1. Corrupt `settings.json` in the app data dir and launch.
2. Confirm the app starts with default settings instead of crashing.
   Observed by agent in tauri dev, not independently confirmed.

### M1-04 Log file created

1. Launch with the file log target and confirm the log file is created in the
   app log directory.
   Observed by agent in tauri dev, not independently confirmed.

### M1-05 2 MB log rotation

The file logger rotates at 2 MB.

1. Run the app and drive enough logging to exceed 2 MB, or lower the cap
   temporarily.
2. Confirm a rotated file appears and the active log stays under the cap.

### M1-06 Screenshot checks

1. `screencapture` checks need Screen Recording permission for the terminal
   (System Settings > Privacy & Security > Screen Recording).

### M3-01 Google OAuth round-trip

Needs a Google client ID/secret, a Google Cloud OAuth client with redirect URI
`http://localhost:8787/api/auth/callback/google`, and a **built macOS app**: deep
links do not work under `tauri dev`.

1. Put `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `apps/api/.env`, run
   `pnpm db:up`, `pnpm --filter api db:migrate`, `pnpm --filter api dev`.
2. Build the app: `pnpm --filter desktop tauri build` then open the bundled app from
   `/Applications`.
3. Sign in with Google in the app, confirm the browser opens, and confirm the
   callback returns to the app signed in.
4. Sign in a second time with the same account to confirm account linking, and once
   with a different provider to confirm the linking policy.

### M3-02 Windows webview origin

Windows webviews use `http://tauri.localhost` instead of `tauri://localhost`.

1. On Windows, run the app against the API, sign in, and make one authenticated
   `/api/me` call.
2. Confirm CORS allows the origin and no preflight fails.

### M3-03 Real keychain round-trip

Exercises the OS keychain instead of the test double.

1. `cd apps/desktop/src-tauri && cargo test -- --ignored keychain_roundtrip`
2. Confirm the value is written, read back, and removed.

### M3-04 Compose Postgres port clash

A native Postgres listening on `127.0.0.1:5432` shadows the compose container's
published port, so `localhost:5432` reaches the wrong server.

1. Free 5432, or change the host side of the port mapping in `docker-compose.yml`
   to `"5433:5432"` and use `postgres://app:app@localhost:5433/app`.

### M4-01 Per-user database isolation

These need a built/running app (the Tauri plugin cannot run under Node).

1. Sign in as two different users and confirm each gets its own
   `app-<sha256>.db` under the app data dir
   (`~/Library/Application Support/<id>/` on macOS) and never sees the other
   user's notes.

### M4-02 Relaunch does not re-run migrations

1. Relaunch: migrations must not re-run (check `_migrations`) and the last notes
   are visible immediately from the persisted query cache.

### M4-03 10,000-note scrolling

1. Create ~10,000 notes and scroll: virtualization keeps the DOM node count under
   100 and scrolling stays smooth.

### M4-04 Offline notes and mutation errors

1. Stop the API (or disconnect): cached notes still render, and a mutation shows a
   clear error rather than a silent failure.

### M4-05 Sign-out closes the local database

1. Sign out and back in: the local database closes and reopens; the persisted query
   cache is cleared on sign-out.

### M4-06 Migration failure error screen

1. Force a migration failure (e.g. corrupt `0002_notes_created_at.sql` in a dev
   build) and confirm the notes error screen offers Retry and Sign out, and that
   Account/Settings stay reachable.

### M4-07 Lost session does not leak notes

1. Lose the session through a 401 (revoke it server-side) and confirm the next
   sign-in as another user shows none of the previous user's notes.

### M5-01 Remote flag values replace defaults

1. Set a real `VITE_POSTHOG_KEY` (and host, if EU) in
   `apps/desktop/.env.development`, build/run the app, and confirm remote values
   replace defaults without a restart (within the 5-minute refresh, or on the next
   launch).

### M5-02 Dashboard toggle and variant

1. Toggle a flag in the PostHog dashboard and confirm the app sees the change,
   including a variant switch.

### M5-03 Offline flag cache then defaults

1. With the key present, disable the network: the app must start with cached
   values, then defaults on a fresh install.

### M5-04 Consent-based identify/revoke

1. Grant telemetry consent in settings and confirm the person uses the auth user
   id; revoke it and confirm the next request uses the anonymous id and no further
   exposure events appear.

### M5-05 Dev overrides and production block

1. Open `/settings/flags` in a dev build, set an override, restart, and confirm it
   persists; build with `VITE_APP_ENV=prod` and confirm the route redirects and
   overrides cannot be set.

### M5-06 CSP allows PostHog in a built app

1. Confirm the built app's CSP allows the PostHog request (no `connect-src`
   violation in the webview console) with a real `VITE_POSTHOG_KEY`.

### M5-07 Dashboard change reaches built app

1. Create `betaExport` in PostHog and confirm a dashboard rule change reaches a
   built app within the 5-minute refresh interval.

### M6-01 Test-mode checkout flips the plan

1. With test keys in `apps/api/.env`, run a test-mode checkout end to end and
   confirm the app flips to Pro within about 30 seconds without a restart. Confirm
   the report says `test_mode`.

### M6-02 Webhook tunnel and replay

1. Deliver a real webhook through a tunnel the user sets up; confirm signature
   verification and idempotency on a replayed event.

### M6-03 Customer portal

1. Open the customer portal from the pricing page and confirm it loads for the
   test customer.

### M6-04 Cancellation timing

1. Verify when `subscription.cancelled` fires (immediate vs period end) and whether
   the payload carries a scheduled-cancel field.

### M6-05 Metadata and return parameters

1. Confirm whether subscription webhooks echo `metadata` and on which object, and
   whether `return_url` receives `payment_id`/`status`/`email`.

### M6-06 Past-due banner and grace

1. Force a `past_due` event and confirm the banner and the grace deadline behavior.

### M6-07 Account deletion blocked

1. With an active subscription, deleting the account must show the server's
   "cancel first" error.

### M7-01 Scrubbed error reaches Sentry

1. With a real `VITE_SENTRY_DSN`, accept consent, trigger a test error, and confirm
   it appears scrubbed in Sentry (release/environment tags present).

### M7-02 Release panic reaches Sentry

1. Build with `SENTRY_DSN`, accept consent, and confirm a forced panic in a
   **release** build reaches Sentry (the debug-only command is for dev; add a
   temporary release trigger or test build when doing this). Test mode only; no
   account tooling.

### M7-03 Source-map symbolication

1. Confirm source-map symbolication works in a CI-built artifact (M9 upload step).

### M7-04 PostHog events after consent

1. With a real PostHog key, accept consent and confirm the M7 events and
   `$pageview` arrive; then revoke and confirm they stop.

### M7-05 Zero network before consent

1. In a built app with devtools, confirm zero network requests to Sentry/PostHog
   before consent and no breadcrumbs sent. Confirm flag requests are also absent
   with the default `VITE_FLAGS_REQUIRE_CONSENT=true`.

### M7-06 Consent UI and log preview

1. Confirm the first-run consent card does not block sign-in, and that the
   settings toggle + "Report a problem" preview shows the redacted log before
   confirmation.

### M8-01 Tray icon and menu

Run on a **built** app (`pnpm tauri build` through
`apps/desktop/scripts/tauri.mjs` so the CSP and updater config are generated).

1. Launch the app; confirm the tray icon and menu (Open, Check for updates, Quit).

### M8-02 Close-to-tray off quits

1. With **Close to tray off**, closing the window quits the app.

### M8-03 Close-to-tray on stays resident

1. Enable **Close to tray** in Settings, close the window: the process stays in the
   tray; Open restores and focuses it; Quit exits.

### M8-04 macOS dock behavior

1. macOS: hiding to the tray removes the dock icon; reopening restores it.

### M8-05 Global shortcut default

1. Default `CommandOrControl+Shift+Space` hides/shows the window.

### M8-06 Global shortcut changed

1. Change it in Settings and confirm the new accelerator works.

### M8-07 Shortcut conflict toast

1. Set an accelerator already used by another app: a toast explains the conflict
   and the app stays usable.

### M8-08 Shortcut disabled

1. Clear the field: the shortcut is unregistered.

### M8-09 Single instance focuses the window

1. Open the app, then launch a second copy (Finder/`open -n` or the exe).
2. No second window appears; the first window is focused.

### M8-10 Single instance forwards a deep link

1. While the app is running, launch a second copy with a deep-link argument or
   `open "tauri-saas-starter://billing/success"`; the link is forwarded to the
   first instance.

### M8-11 Cold-start deep link

1. Quit the app, `open "tauri-saas-starter://billing/success"`; the app launches and
   refetches the entitlement.

### M8-12 Warm-start deep link

1. With the app running, repeat; same behavior, no second instance.

### M8-13 Unknown deep link ignored

1. Unknown link (`tauri-saas-starter://admin/run` or another scheme) is ignored
   and logged; no navigation or command runs.

### M8-14 Notifications permission

1. Enable notifications in Settings; macOS asks for permission.
2. Confirm a notification appears after granting; denying leaves the app usable.

### M8-15 Launch at login

1. Off by default. Enable, log out/in, confirm the app starts.
2. Disable and confirm it no longer starts.

### M8-16 Signed update N to N+1

1. Generate keys (once, not in this repo):
   `pnpm tauri signer generate -w ~/.tauri/app.key`.
2. Put the public key in `TAURI_UPDATER_PUBLIC_KEY`; set `VITE_UPDATER_ENDPOINT`
   to a `latest.json` feed (GitHub Releases or R2).
3. Build N, then publish N+1 with `.sig` files and a `latest.json`; start N.
4. About 10 s after first paint, a non-blocking toast offers the update.
5. Download shows progress; "Restart to update" relaunches into N+1.
6. Never commit or log the private key; CI uses `TAURI_SIGNING_PRIVATE_KEY` as a
   secret (M9).

### M8-17 Updater failure resilience

1. Break the feed or signature: the app keeps running and reports the error.

### M8-18 Beta channel flag gate

1. Beta channel only appears when the `betaUpdates` flag is on.

### M8-19 Windows native parity

1. On Windows, repeat the tray, shortcut, single-instance, deep-link and update
   checks above.

## Results log

Newest last. One entry per manual run: who ran it, what they saw, evidence path
or pasted output.

### 2026-10-19 — M1-02 — Passed (user)

- Who: user.
- OS/build: macOS, `tauri dev`.
- Seen: dark/light title bar follows the app theme.
- Evidence: reported by the user to the reviewer.

### 2026-10-20 — M1-03 — Agent dev-run observation (not a human pass)

- Who: agent, `tauri dev`.
- Seen: a corrupt settings file starts the app with defaults.
- Status: Not run. Observed by agent in tauri dev, not independently confirmed.

### 2026-10-20 — M1-04 — Agent dev-run observation (not a human pass)

- Who: agent, `tauri dev`.
- Seen: the file log is created in the app log directory.
- Status: Not run. Observed by agent in tauri dev, not independently confirmed.

### M9-03 Built-app headless CI smoke

1. In CI, launch the built app in a headless environment and assert it starts and
   stays up for the check window; fail the job if it exits or panics.

### M9-01 Repository variables and secrets

1. Set the variables and secrets in `docs/release.md` (Settings → Actions).
2. Confirm no real values are in the repo.

### M9-02 Branch protection checks

1. Protect `main` and require the CI jobs listed in `docs/release.md`.
2. Confirm a failing check blocks merge.

### M9-04 Apple signing and notarization

1. Create a Developer ID Application certificate and notarization credentials.
2. Add `APPLE_*` secrets and run a tag build.
3. Confirm the draft `.dmg`/`.app` is signed and notarized.

### M9-05 Windows signing

1. Create Azure Trusted Signing or a code-signing certificate.
2. Add the Windows secrets and confirm the draft installer is signed.

### M9-06 Updater key pair

1. Generate the key locally (never commit it).
2. Put the private key in Actions and the public key in the repository variable.

### M9-07 Draft release assets

1. Push a `v*` tag; wait for the draft.
2. Check macOS universal and Windows assets, `.sig` files and `latest.json`.

### M9-08 Publish the release

1. Install the draft assets and smoke them.
2. A human publishes the draft; nothing auto-publishes.

### M9-09 Real update from draft build

1. Install version N, publish N+1, wait for the deferred check.
2. Confirm download, restart and the new version.

### M9-10 Dependabot review

1. Check the weekly Dependabot PRs and CI results.

### M9-11 Environment release with reviewers

1. Settings → Environments → New environment named `release`.
2. Add at least one required reviewer; limit deployment branches to tags `v*`.
3. Move the signing secrets listed in `docs/release.md` into environment
   secrets; confirm a tag run waits for approval before receiving them.

### M9-12 Tag ruleset for v* tags

1. Settings → Rules → New ruleset targeting tags `v*`.
2. Allow creations/deletions only for maintainers; block force pushes and
   deletions.
3. Confirm a tag pushed by an allowed actor on a commit that is not on `main`
   fails the release workflow before building.
