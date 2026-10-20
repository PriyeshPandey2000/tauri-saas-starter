# M8: Native Features & Auto-Update

**Goal:** Desktop-grade behavior: tray, shortcuts, single instance, deep link routing, signed auto-updates.
**Prereqs:** M7 PASS.

## Tasks

- [x] 8.1 Single instance: `tauri-plugin-single-instance`. Second launch focuses existing window and forwards any deep-link URL to it.
- [x] 8.2 Central deep-link router `app/deepLinks.ts`: registry mapping path prefixes (`auth/callback`, `billing/success`) to handlers. Unknown links ignored and logged. Handles cold start and warm start. Refactor M3 and M6 handlers to register here.
- [x] 8.3 Tray icon + menu (Open, Check for updates, Quit). Setting "Close to tray" (default off). macOS: dock behavior correct. Menu labels via i18n.
- [x] 8.4 Global shortcut (default Cmd/Ctrl+Shift+Space) toggles window visibility. User can change/disable in settings; conflicts handled with an error toast. Register through `tauri-plugin-global-shortcut`.
- [x] 8.5 Native menu bar (macOS app menu with About, Settings (Cmd+,), standard Edit menu so copy/paste works; Windows minimal).
- [x] 8.6 Notifications via `tauri-plugin-notification` with permission request flow wrapped in a small `notify()` helper.
- [x] 8.7 Launch at login (autostart plugin), off by default, toggle in settings.
- [x] 8.8 Auto-update: `tauri-plugin-updater`. Generate signing keypair; public key in config, private key as CI secret (document, never commit). Endpoint: static `latest.json` on GitHub Releases or R2 (config). Flow: check on start (deferred ~10s after first paint) and every 6h; show non-blocking toast "Update available" -> download with progress -> "Restart to update". Skip/postpone supported. Update channel setting: stable|beta (beta gated by flag `betaUpdates`).
- [x] 8.9 Update failure never blocks the app; errors logged + reported.
- [x] 8.10 Capabilities updated with exactly the new permissions, each commented.
- [x] 8.11 Tests where possible (deep-link router unit tests, shortcut config validation). Manual checks are rows M8-01 to M8-19 in `docs/deferred-checks.md`.

## Acceptance criteria

- Launching a second copy never creates a second window.
- Clicking an OAuth/checkout deep link while app is closed (cold) and open (warm) both work.
- Update from version N to N+1 works end to end using a locally hosted test feed (paste log).
- Shortcut conflict shows toast, app stays stable.
- Tests, lint, typecheck green.

## Out of scope

Linux packaging polish, custom titlebar, widgets.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Review checklist

- [ ] Updater signature enforced; private key not in repo.
- [ ] Deep links validated, no arbitrary navigation or command execution from URL content.
- [ ] Capabilities minimal.
- [ ] Update check deferred so it doesn't hurt startup.

## Agent report

**Status: complete for M8.1-M8.11 (2026-10-20), pending manual/real-feed checks.**

### What shipped

- **8.1 Single instance.** `tauri-plugin-single-instance@2.5.4` registered first;
  a second launch focuses the main window and emits forwarded deep-link URLs.
- **8.2 Deep-link router.** `app/deepLinks.ts` validates scheme/host/path against
  an allowlist (`auth/callback`, `billing/success`), dedupes, ignores and logs
  everything else, and listens for cold start, warm start and single-instance
  events. Auth and billing bridges were removed; `main.tsx` registers handlers.
- **8.3 Tray.** Tray icon + Open/Check for updates/Quit menu; close-to-tray is a
  persisted setting (default off); macOS dock switches to accessory while hidden
  and back to regular when focused.
- **8.4 Global shortcut.** User-configurable (default
  `CommandOrControl+Shift+Space`, empty disables); conflicts show a toast and
  report through the error port.
- **8.5 Native menu.** App menu with About/Settings (Cmd+,)/Quit and a standard
  Edit menu for copy/paste; Settings emits a native event the app routes.
- **8.6 Notifications.** `tauri-plugin-notification@2.7.0` with a `notify()`
  helper that requests permission; settings toggle triggers the flow.
- **8.7 Launch at login.** `tauri-plugin-autostart@2.7.0`, off by default,
  synced from settings.
- **8.8/8.9 Auto-update.** `tauri-plugin-updater@2.14.0` with signature
  verification (public key from build env, private key never in the repo),
  10-second deferred check and 6-hour interval, stable/beta feeds selected by separate configured endpoints (beta requires the
  `betaUpdates` flag and the setting), progress toast, restart action, and
  non-blocking errors. With no updater config the plugin is not registered and
  the JS side stays idle (Settings shows "updates not configured").
- **8.10 Capabilities.** Added only global-shortcut, notification, autostart,
  updater and process permissions, each commented.
- **8.11 Tests/docs.** Deep-link parser/router tests, updater channel/scheduler/
  failure tests, native settings validation, CSP updater-origin test; manual
  register rows M8-01 to M8-19 in `docs/deferred-checks.md`.

### Verification (real output)

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  37 passed (37)
desktop:test:       Tests  137 passed (137)
api:test:  Test Files  11 passed (11)
api:test:       Tests  51 passed (51)
 Tasks:    2 successful, 2 total

$ cd apps/desktop/src-tauri && cargo test
running 9 tests
test result: ok. 8 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
```

### Review fix round (2026-10-20)

- Updater plugin is registered in `setup` only when `plugins.updater` exists;
  otherwise it is absent and JS schedules no checks or error reports. Added a
  typed `updater_configured` command and a Settings note.
- Stable and beta resolve different feed URLs: `scripts/tauri.mjs` injects the
  configured endpoints array (stable index 0, beta index 1) and the Rust
  `check_update` command selects by channel via the updater builder's runtime
  endpoint API (Tauri updater docs, "Runtime Configuration / Endpoints"). JS
  still gates beta on both `betaUpdates` and the setting.
- `process:default` replaced with `process:allow-restart`, commented.
- Updater failures are reported; "not configured" is a quiet no-op.
- `deepLinks.ts` prunes dedupe entries older than the window.
- Added register row M9-03 for the future headless CI smoke test.
- Also fixed a latent composition-root ordering bug: `setDefaultSecureStore`
  now runs before `createPorts`, so the Tauri auth adapter no longer throws
  "No secure store configured" at module load.

### Startup proof

The process rule requires a real `tauri dev` run. Both runs started and stayed
up for 20 seconds; we terminated them with SIGTERM at the 20-second mark, which
is the only error shown.

No updater env (first 30 lines):

```
> desktop@0.1.0 tauri /Users/priyesh/Desktop/desktop-app-boilerplate/apps/desktop
> node scripts/tauri.mjs dev

     Running BeforeDevCommand (`pnpm dev`)

> desktop@0.1.0 dev /Users/priyesh/Desktop/desktop-app-boilerplate/apps/desktop
> vite

12:21:12 PM [vite] (client) Re-optimizing dependencies because lockfile has changed

  VITE v8.3.4  ready in 432 ms

  ➜  Local:   http://localhost:1420/
  ➜  Network: use --host to expose
     Running DevCommand (`cargo  run --no-default-features --color always --`)
        Info Watching .../apps/desktop/src-tauri for changes...
   Compiling appsdesktop v0.1.0 (.../src-tauri)
    Building [=======================> ] 595/598: appsdesktop(build)
    Building [=======================> ] 596/598: appsdesktop
    Building [=======================> ] 597/598: appsdesktop(bin)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 4.05s
     Running `target/debug/appsdesktop`
> desktop@0.1.0 tauri: `node scripts/tauri.mjs dev`
Command failed with signal "SIGTERM"   (our 20-second kill)
```

With a dummy stable + beta feed and dummy public key (first 30 lines):

```
> desktop@0.1.0 tauri /Users/priyesh/Desktop/desktop-app-boilerplate/apps/desktop
> node scripts/tauri.mjs dev

Updater config injected (2 feeds, public key present)
     Running BeforeDevCommand (`pnpm dev`)

> desktop@0.1.0 dev /Users/priyesh/Desktop/desktop-app-boilerplate/apps/desktop
> vite

  VITE v8.3.4  ready in 472 ms

  ➜  Local:   http://localhost:1420/
  ➜  Network: use --host to expose
     Running DevCommand (`cargo  run --no-default-features --color always --`)
        Info Watching .../apps/desktop/src-tauri for changes...
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.71s
     Running `target/debug/appsdesktop`
> desktop@0.1.0 tauri: `node scripts/tauri.mjs dev`
Command failed with signal "SIGTERM"   (our 20-second kill)
```

### Round 2 fix (2026-10-20)

- Capabilities now include `core:window:allow-show`, `allow-hide`,
  `allow-is-visible`, `allow-set-focus`, and the four explicit
  `global-shortcut:allow-*` permissions (the plugin default grants none).
  `process:allow-restart` remains.
- All shortcut calls are wrapped: `unregisterAll`/`register` failures become a
  logged report, and only real register conflicts show the toast. Notification
  and deep-link listeners also catch failures, so no call becomes an unhandled
  rejection.
- `scripts/check-capabilities.mjs` scans the frontend for plugin/window API use
  and fails if a required permission is missing (`verify:capabilities`).
- Added a dev-only webview console bridge (Vite terminal) and a
  `[window] shown {"visible":true}` log line.

**Round 2 startup proof.** Both runs stayed up for 20 seconds and were killed by
us with SIGTERM (the only error line shown). Webview console grep for
`webview:(error|warn)|unhandledrejection|not allowed|Failed to` returned
`(none)` in both runs. **Zero console errors and zero unhandled rejections;
window visibility was true.**

No updater env:

```
> desktop@0.1.0 tauri .../apps/desktop
> node scripts/tauri.mjs dev

     Running BeforeDevCommand (`pnpm dev`)
> desktop@0.1.0 dev .../apps/desktop
> vite

  VITE v8.3.4  ready in 445 ms
  ➜  Local:   http://localhost:1420/
     Running DevCommand (`cargo  run --no-default-features --color always --`)
        Info Watching .../src-tauri for changes...
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.73s
     Running `target/debug/appsdesktop`
[webview:info] theme.changed {"theme":"dark"}
[webview:info] theme.changed {"theme":"dark"}
[webview:info] [window] shown {"visible":true}
Command failed with signal "SIGTERM"   (our 20-second kill)
```

With dummy stable + beta feeds and dummy public key:

```
> desktop@0.1.0 tauri .../apps/desktop
> node scripts/tauri.mjs dev

Updater config injected (2 feeds, public key present)
     Running BeforeDevCommand (`pnpm dev`)
> desktop@0.1.0 dev .../apps/desktop
> vite

  VITE v8.3.4  ready in 470 ms
  ➜  Local:   http://localhost:1420/
     Running DevCommand (`cargo  run --no-default-features --color always --`)
        Info Watching .../src-tauri for changes...
   Compiling appsdesktop v0.1.0 (.../src-tauri)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 8.45s
     Running `target/debug/appsdesktop`
[webview:info] theme.changed {"theme":"dark"}
[webview:info] theme.changed {"theme":"dark"}
[webview:info] [window] shown {"visible":true}
Command failed with signal "SIGTERM"   (our 20-second kill)
```

### Not run (user-gated)

- The built-app checks M8-01 to M8-19 in `docs/deferred-checks.md`: tray, close-to-tray,
  dock behavior, shortcut conflicts, notifications permission, launch at login.
- A real signed update from N to N+1 with a local/remote feed: no updater
  private key or feed exists here by design. The updater logic is unit-tested
  with injected checks; signature verification is the plugin's native code.
- Windows-specific packaging/manual checks.

## Review

**Verdict: CHANGES REQUIRED** (2026-10-20). One blocker found by actually running the app; the rest is good work.

Verified by reviewer: forced gates pass (desktop 135 tests, api 51, cargo 7 passed + 1 ignored); the deep-link router validates scheme, userinfo, port and an exact host/path allowlist, ignores and logs everything else, dedupes, and handlers only register for allowlisted keys; single-instance forwarding passes only arguments that start with the app scheme; the Rust side emits and the JS side re-validates; the private updater key is not in the repo and the secret guard covers it; the updater verifies signatures natively; checks are deferred 10 s and repeated every 6 h; global shortcut, autostart and notifications are opt-in or user-configurable.

Blocker:

1. **The app panics on startup in the default setup.** `tauri_plugin_updater::Builder::new().build()` is registered unconditionally, but `plugins.updater` is only injected by `scripts/tauri.mjs` when BOTH `VITE_UPDATER_ENDPOINT` and `TAURI_UPDATER_PUBLIC_KEY` are set. Without them (the normal dev case) `pnpm --filter desktop tauri dev` dies with: `PluginInitialization("updater", "Error deserializing 'plugins.updater' within your Tauri configuration: invalid type: null, expected struct Config")`. Reproduced by the reviewer. Fix so the app starts with and without updater configuration: register the updater only when its config is present (e.g. via `app.handle().plugin(...)` in `setup` after checking the config), or ship a safe static `plugins.updater` that disables checks; the JS side must treat "updater not configured" as a quiet no-op (no scheduled checks, no error reports). Prove it by running `tauri dev` both ways and pasting the startup output.

Must fix: 2. **Channel gating does nothing with a static feed.** `check({ headers: { "x-update-channel": channel } })` cannot select a different `latest.json` on GitHub Releases or R2; static hosting ignores the header. Make the channel select a different endpoint (a separate beta feed URL from env, applied through a mechanism the updater actually supports; check the current plugin docs), and test that stable and beta resolve different URLs. Document it. 3. **`process:default` is broader than needed** (it also allows exit). Use only the restart permission, and comment it. 4. Updater errors are reported to the error reporter even when no feed is configured; only report real failures (feed unreachable, bad signature), not "not configured". 5. `recent` in `deepLinks.ts` grows without bound; prune entries older than the dedupe window. 6. Process rule for the agent: any change to Rust plugins or startup must be proven by running `tauri dev` and pasting the first 30 lines of output, and the report must say whether the app started. Add a smoke-test row to the register for M9.3.

Not verified: tray, close-to-tray, dock behavior, shortcut conflicts, notifications, login item, cold/warm deep links and a real N to N+1 update (rows M8-01 to M8-19 in the register).

### Round 2 (2026-10-20): CHANGES REQUIRED (capabilities), found by running the app

The fixes landed: the app now starts without updater env, `process:allow-restart` replaced `process:default`, the feed channels use runtime endpoints, and the secure-store ordering bug is gone. But the reviewer ran `tauri dev` again for 25 s with no updater env and the webview console (printed by Vite) shows permission errors that the agent's "no panic" check cannot see:

- `Failed to show the main window: window.show not allowed. Permissions associated with this command: core:window:allow-show` (the window is created hidden and revealed by `show()`, so this can leave the app invisible; add `core:window:allow-show` with a comment).
- `Unhandled rejection: global-shortcut.unregister_all not allowed. Permissions: global-shortcut:allow-unregister-all` (repeats on settings changes; the shortcut feature cannot reset). Add the needed global-shortcut permissions explicitly (register, unregister, unregister-all, is-registered) and wrap the calls so a denied call never becomes an unhandled rejection.
  Process rule update (applies to every milestone from now on): the startup proof must include the WEBVIEW console output from the dev log, and the report must state "zero console errors and zero unhandled rejections in a 20 s run" or list them. A run with errors is not a passing proof. Fix every capability error found, then re-run and paste the clean output.
  Also add a test that fails if a command the frontend calls is missing from the capability file where feasible (e.g. a script that scans `@tauri-apps/plugin-*` and `getCurrentWindow()` calls against the permissions list), or document why not.

## Verification summary

- **Automated tests:** the report's lint, typecheck, test, build and cargo gates passed (deep-link parser/router, updater scheduler/channel/failure, native settings, CSP updater origin).
- **Agent dev-run observations:** two 20-second `tauri dev` runs (with and without updater config) showed zero webview console errors/rejections and `[window] shown {"visible":true}`; capability audit script passes.
- **Manual human checks still open:** [M8-01](../deferred-checks.md#m8-01-tray-icon-and-menu), [M8-02](../deferred-checks.md#m8-02-close-to-tray-off-quits), [M8-03](../deferred-checks.md#m8-03-close-to-tray-on-stays-resident), [M8-04](../deferred-checks.md#m8-04-macos-dock-behavior), [M8-05](../deferred-checks.md#m8-05-global-shortcut-default), [M8-06](../deferred-checks.md#m8-06-global-shortcut-changed), [M8-07](../deferred-checks.md#m8-07-shortcut-conflict-toast), [M8-08](../deferred-checks.md#m8-08-shortcut-disabled), [M8-09](../deferred-checks.md#m8-09-single-instance-focuses-the-window), [M8-10](../deferred-checks.md#m8-10-single-instance-forwards-a-deep-link), [M8-11](../deferred-checks.md#m8-11-cold-start-deep-link), [M8-12](../deferred-checks.md#m8-12-warm-start-deep-link), [M8-13](../deferred-checks.md#m8-13-unknown-deep-link-ignored), [M8-14](../deferred-checks.md#m8-14-notifications-permission), [M8-15](../deferred-checks.md#m8-15-launch-at-login), [M8-16](../deferred-checks.md#m8-16-signed-update-n-to-n1), [M8-17](../deferred-checks.md#m8-17-updater-failure-resilience), [M8-18](../deferred-checks.md#m8-18-beta-channel-flag-gate), [M8-19](../deferred-checks.md#m8-19-windows-native-parity), plus [M7-02](../deferred-checks.md#m7-02-release-panic-reaches-sentry) and [M7-05](../deferred-checks.md#m7-05-zero-network-before-consent).
