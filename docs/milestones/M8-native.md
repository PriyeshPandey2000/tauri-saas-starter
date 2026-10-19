# M8: Native Features & Auto-Update

**Goal:** Desktop-grade behavior: tray, shortcuts, single instance, deep link routing, signed auto-updates.
**Prereqs:** M7 PASS.

## Tasks
- [ ] 8.1 Single instance: `tauri-plugin-single-instance`. Second launch focuses existing window and forwards any deep-link URL to it.
- [ ] 8.2 Central deep-link router `app/deepLinks.ts`: registry mapping path prefixes (`auth/callback`, `billing/success`) to handlers. Unknown links ignored and logged. Handles cold start and warm start. Refactor M3 and M6 handlers to register here.
- [ ] 8.3 Tray icon + menu (Open, Check for updates, Quit). Setting "Close to tray" (default off). macOS: dock behavior correct. Menu labels via i18n.
- [ ] 8.4 Global shortcut (default Cmd/Ctrl+Shift+Space) toggles window visibility. User can change/disable in settings; conflicts handled with an error toast. Register through `tauri-plugin-global-shortcut`.
- [ ] 8.5 Native menu bar (macOS app menu with About, Settings (Cmd+,), standard Edit menu so copy/paste works; Windows minimal).
- [ ] 8.6 Notifications via `tauri-plugin-notification` with permission request flow wrapped in a small `notify()` helper.
- [ ] 8.7 Launch at login (autostart plugin), off by default, toggle in settings.
- [ ] 8.8 Auto-update: `tauri-plugin-updater`. Generate signing keypair; public key in config, private key as CI secret (document, never commit). Endpoint: static `latest.json` on GitHub Releases or R2 (config). Flow: check on start (deferred ~10s after first paint) and every 6h; show non-blocking toast "Update available" -> download with progress -> "Restart to update". Skip/postpone supported. Update channel setting: stable|beta (beta gated by flag `betaUpdates`).
- [ ] 8.9 Update failure never blocks the app; errors logged + reported.
- [ ] 8.10 Capabilities updated with exactly the new permissions, each commented.
- [ ] 8.11 Tests where possible (deep-link router unit tests, shortcut config validation). Manual test checklist file `docs/manual-tests.md` listing steps for tray, shortcut, single instance, update on mac and Windows.

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
_(agent fills)_

## Review
_(reviewer fills)_
