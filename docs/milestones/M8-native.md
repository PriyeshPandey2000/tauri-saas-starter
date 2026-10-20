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
- [x] 8.11 Tests where possible (deep-link router unit tests, shortcut config validation). Manual test checklist file `docs/manual-tests.md` listing steps for tray, shortcut, single instance, update on mac and Windows.

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
  10-second deferred check and 6-hour interval, channel gating via the
  `betaUpdates` flag, progress toast, restart action, and non-blocking errors.
- **8.10 Capabilities.** Added only global-shortcut, notification, autostart,
  updater and process permissions, each commented.
- **8.11 Tests/docs.** Deep-link parser/router tests, updater channel/scheduler/
  failure tests, native settings validation, CSP updater-origin test; manual
  checklist in `docs/manual-tests.md`.

### Verification (real output)

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  37 passed (37)
desktop:test:       Tests  135 passed (135)
api:test:  Test Files  11 passed (11)
api:test:       Tests  51 passed (51)
 Tasks:    2 successful, 2 total

$ cd apps/desktop/src-tauri && cargo test
running 8 tests
test result: ok. 7 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
```

### Not run (user-gated)

- The built-app manual checks in `docs/manual-tests.md`: tray, close-to-tray,
  dock behavior, shortcut conflicts, notifications permission, launch at login.
- A real signed update from N to N+1 with a local/remote feed: no updater
  private key or feed exists here by design. The updater logic is unit-tested
  with injected checks; signature verification is the plugin's native code.
- Windows-specific packaging/manual checks.

## Review

_(reviewer fills)_
