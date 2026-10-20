# M1: App Shell

**Goal:** Navigable app skeleton with theming, settings, window persistence, error handling.
**Prereqs:** M0 PASS.

## Tasks

- [x] 1.1 Install TanStack Router with file-based routing plugin for Vite. Routes in `src/routes/`. Add `__root.tsx`, `index.tsx`, `settings.tsx`, `404` (notFoundComponent).
- [x] 1.2 Install TanStack Query. Create `app/providers.tsx` wrapping `QueryClientProvider` with sane defaults (staleTime 30s, retry 2, refetchOnWindowFocus true). Provide router context with `queryClient`.
- [x] 1.3 Layout: `app/layout/AppShell.tsx` with sidebar (collapsible) + top bar + content outlet. Sidebar items come from a typed registry `shared/lib/nav.ts` so features can register entries (do not hardcode in the component).
- [x] 1.4 Theming: light/dark/system. Store preference, apply `class="dark"` on `<html>` before first paint (inline script or early effect) to avoid flash. Follow OS changes when "system".
- [x] 1.5 Settings store (Zustand + persist) in `features/settings/`. Schema defined with Zod in `packages/shared` (`AppSettingsSchema`): theme, language, sidebarCollapsed, telemetryConsent (default `unset`). Persist through Tauri `plugin-store` (file in app data dir), NOT localStorage. Validate on load, fall back to defaults on invalid data.
- [x] 1.6 Settings page: theme selector, language selector (stub with `en` only), sidebar toggle. Use React Hook Form + Zod.
- [x] 1.7 i18next set up with `en` namespace files in `shared/i18n/locales/en/`. All visible strings in new UI go through `t()`.
- [x] 1.8 Window state persistence via `tauri-plugin-window-state`. Window remembers size/position.
- [x] 1.9 Error handling: route-level `errorComponent`, a global `ErrorBoundary` in providers, and a friendly full-page fallback with "Reload" button. Unhandled promise rejection + `window.onerror` log to console (logger comes in M2).
- [x] 1.10 Toast system (shadcn `sonner`) mounted once in providers.
- [x] 1.11 Command palette (shadcn `cmdk`): Ctrl/Cmd+K opens, lists nav entries and a "Toggle theme" action from a registry `shared/lib/commands.ts`.
- [x] 1.12 Splash/skeleton: app renders shell skeleton immediately; no blank white window on launch.
- [x] 1.13 Route-level code splitting enabled (autoCodeSplitting). Confirm settings route is a separate chunk.

## Acceptance criteria

- Navigating between routes works; unknown route shows 404.
- Theme persists across restarts; no light flash when dark is chosen.
- Resize/move window, quit, relaunch: window restored.
- Corrupt the settings file by hand: app still starts with defaults.
- Throwing in a route component shows the error UI, not a blank screen.
- Cmd/Ctrl+K opens palette.
- Lint, typecheck, tests green. Add unit tests: settings schema fallback, nav registry.

## Out of scope

Auth, data fetching, native tray/shortcuts, real translations.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter desktop build   # paste chunk list; settings must be its own chunk
```

## Review checklist

- [ ] Persistence uses plugin-store, not localStorage.
- [ ] Nav and commands are registries (features can add without editing core).
- [ ] No hardcoded user-visible strings.
- [ ] Theme flash handled.
- [ ] Zod schema lives in `packages/shared`.

## Agent report

Toolchain: Node v24.18.0, pnpm 10.14.0. Rust stable updated 1.89.0 -> 1.99.1 so the
latest `tauri-plugin-store` 2.5.0 and `tauri-plugin-window-state` 2.5.0 crates build
(they require rustc >= 1.90). All added JS deps and Rust crates are recorded in
`docs/DECISIONS.md`.

### `pnpm lint`

```
 Tasks:    4 successful, 4 total
check-vendor-imports: OK (no vendor SDK imports outside ports/adapters)
```

### `pnpm typecheck`

```
 Tasks:    3 successful, 3 total
```

### `pnpm test`

```
 desktop:test:  ✓ src/__tests__/basic.test.ts (1 test)
 desktop:test:  ✓ src/features/settings/__tests__/settings-schema.test.ts (3 tests)
 desktop:test:  ✓ src/features/settings/__tests__/settings-rehydrate.test.ts (4 tests)
 desktop:test:  ✓ src/shared/lib/__tests__/nav.test.ts (2 tests)
 desktop:test:  ✓ src/shared/lib/__tests__/theme.test.ts (2 tests)
 desktop:test:  ✓ src/shared/lib/__tests__/commands.test.ts (3 tests)
 desktop:test:  Test Files  6 passed (6)
 desktop:test:       Tests  15 passed (15)
 api:test:      Test Files  1 passed (1)  Tests  1 passed (1)
```

### `pnpm --filter desktop build`

```
dist/index.html                            0.46 kB
dist/assets/settings-<hash>.js              1.3 kB   <- settings route, own chunk
dist/assets/routes-<hash>.js                0.36 kB
dist/assets/useTranslation-*.js           ~57.35 kB │ gzip: 18.90 kB
dist/assets/index-<hash>.js              ~563.27 kB │ gzip: 177.39 kB
✓ built
```

Exact Vite output (2026-10-19):

```
dist/index.html                            0.46 kB
dist/assets/settings-*.js                   1.38 kB   <- separate route chunk
dist/assets/routes-*.js                     0.36 kB
dist/assets/rolldown-runtime-*.js           0.59 kB
dist/assets/dist-js-*.js                    2.45 kB
dist/assets/useTranslation-*.js            57.35 kB
dist/assets/index-*.js                    563.27 kB (gzip 177.39 kB)
```

### `cargo check` (native plugins compile)

```
   Compiling tauri-plugin-store v2.5.0
   Compiling tauri-plugin-window-state v2.5.0
   Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.34s
```

## Agent report (round 2)

Round-2 fixes, one commit each with a `Refs: M1.n` footer:

- `584b5fc` (M1.11) settings page binds straight to the store; the
  `@testing-library/react` test mounts the page, sets the theme via the store, then
  changes another field and asserts the theme is unchanged. New dev deps
  `@testing-library/react@16.3.3` and `@testing-library/dom@10.4.2` logged in
  `docs/DECISIONS.md`.
- `3f39568` (M1.12) `applyWindowTheme` sets the native title bar to `light`/`dark` for
  an explicit choice and `null` for `system` (follows the OS); no-op outside Tauri. It
  runs once before `show()` and `WindowThemeSync` (in `app/`) subscribes to
  `settings.theme`. The one new permission `core:window:allow-set-theme` is the only
  addition; the capabilities file moved `json` -> `toml` so the permission carries a
  comment (deviation logged in `docs/DECISIONS.md`).
- `05e0a73` (M1.13) `settings-storage.ts` warns once (with the cause) when the
  plugin-store load fails and it falls back to memory storage.
- `eafc755` the reviewer's doc edit was committed as requested.

Verification (all re-run after the fixes):

```
pnpm lint      -> 4 tasks, check-vendor-imports: OK (no vendor SDK imports outside ports/adapters)
pnpm typecheck -> 3 tasks successful
pnpm test      -> desktop 7 files / 16 tests passed; api 1 file / 1 test passed
pnpm --filter desktop build -> built in 379ms
   dist/assets/index-*.js        527.60 kB (gzip 165.31 kB)   <- was 563.27 kB / 177.39 kB
   dist/assets/settings-*.js       0.07 kB   (separate route chunk)
   dist/assets/window-*.js        13.20 kB   (lazy)
   dist/assets/useTranslation-*.js 57.35 kB
   dist/assets/event-*.js          1.31 kB
cargo check    -> Finished `dev` profile in 2.34s (capabilities default.toml parsed)
tauri dev      -> Vite ready on http://localhost:1420/, cargo built appsdesktop, ran
                  target/debug/appsdesktop (stopped with SIGTERM after the check)
```

The main chunk shrank because react-hook-form and its zod resolver left the bundle with
the settings-page rewrite.

Manual checks not run (no display available here; `screencapture` fails with "could not
create image from display", so the no-flash frame and the title-bar colour cannot be
seen): title bar dark on a light OS and light on a dark OS, System following the OS,
window size restore, route throw -> error UI, Cmd/Ctrl+K palette, 404 route, and the
settings autosave round-trip.

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 34.57s

```

### Not run

- Screenshot of the running window: `screencapture` returns "could not create image
  from display" in this session, so the visual no-flash moment could not be captured.
- Full `tauri build` (installer) not run in this session.

### Runtime evidence (2026-10-19, `pnpm --filter desktop tauri dev`)

The dev server previously never bound: Vite served on 5173 while `devUrl` is 1420, so
`tauri dev` waited forever. Fixed by pinning the dev server to 1420 (commit under M1.1).

With that fix `tauri dev` builds and runs. Runtime checks observed:

- Window is revealed after load. `visible: false` in `tauri.conf.json`, and after
  rehydrate + applyTheme the app calls `getCurrentWindow().show()`. Confirmed with
  `osascript` querying the process windows: `Tauri SaaS Starter`.
- OS interface style is light (`AppleInterfaceStyle` unset) while the stored theme is
  dark, i.e. the exact acceptance case. The stored file was
  `{"state":{"theme":"dark",...}}`; the window still appeared, so the hidden-until-ready
  path ran. The no-flash frame itself is not capturable here (see Not run above).
- Corrupt settings: wrote `{ this is not valid json` to
  `~/Library/Application Support/com.example.tauri-saas-starter/settings.json`, relaunched,
  and the window still appeared (app did not hang on the splash). The bad file was then
  restored.

Not verified at runtime (still owed by a human with a visible display): window size
restore, route throw -> error UI, Cmd/Ctrl+K palette, 404 route, and the settings
autosave round-trip.

### Review fixes

All nine review items are addressed, one commit each with a `Refs: M1.n` footer:
`193ec1b`/`d22dfdf` (1), `66673b6` (2), `734f0ba`/`a196898` (3), `0bffcbf` (4),
`9f9a7ab` (5), `2869cd1` (6), `6000713` (7), `83d420b` (8), `bc2c772` (9). Two extra
bugs found while making item 1 provable: Vite served the wrong port for `devUrl`, and
`AppShell` was mounted through router `Wrap`, which wraps the context provider, so
`Link`/`useNavigate` threw `router.isServer`; it now uses `InnerWrap` (inside the
provider). The reviewer note about the main chunk is logged in `docs/DECISIONS.md`.

## Review

**Verdict: CHANGES REQUIRED** (2026-10-19). Structure is good; findings are behavioral.

Verified by reviewer: forced `turbo run lint typecheck test` 9/9 pass; no `localStorage`/`sessionStorage`, no `any`, no raw `invoke(`; schema lives in `packages/shared`; persistence uses plugin-store; nav + command registries are real and the settings feature self-registers (no core edit needed); strings go through `t()` (one exception below).

Must fix:

1. **Theme flash (acceptance: no light flash when dark chosen).** The pre-paint script in `index.html` only reads the OS preference. The stored theme loads async after the Splash is already painted, so "dark" chosen on a light OS flashes light on every launch. Fix: create the window hidden (`visible: false`) and show it only after `rehydrate()` + `applyTheme()` (set `backgroundColor` on the window too), or equivalent. Must be provable by the manual check below.
2. **Startup can hang on a bad settings file.** `bootstrap()` awaits `rehydrate()` with no try/catch; if the store throws or `plugin-store` `load` fails (it silently returns `null` and falls back to in-memory), the user sees the Splash forever or loses saved settings silently. Wrap in try/catch, fall back to defaults, log a warning (console for now), and always render the app.
3. **Corrupt-file fallback is unproven.** Tests cover `parseSettings` only. Add tests for the real path: `settingsStorage`/store `rehydrate()` with invalid JSON, a non-string value, and a missing key must all end in `DEFAULT_SETTINGS` without throwing.
4. **Settings page theme preview leaks.** `applyTheme(watchedTheme)` runs on every radio change but is only persisted on submit; leaving without saving keeps the previewed theme until restart, and store and DOM disagree. Fix: either autosave on change (preferred, no submit button) or revert on unmount if unsaved.
5. **Command palette groups.** Every command is rendered under the "Theme" heading; `groupKey` is ignored. Group by `groupKey`. Also `label="Command palette"` is a hardcoded string; use `t()`.
6. **Copy bugs.** The settings submit button says "Settings" (use a "Save" key, moot if autosave). `ErrorFallback` shows two buttons both labelled "Reload app"; the reset action should read "Try again". Remove unused locale keys (`common.reload`, `common.cancel`) or use them.

Should fix (small): 7. `AppShell` re-implements theme resolution with its own `matchMedia` call and does not follow OS changes for the icon; use `resolveTheme` from `shared/lib/theme` and re-render on change. 8. `settings-storage.ts` casts `as unknown as TauriStore`; use the plugin's exported `Store` type. 9. Add small unit tests: `resolveTheme`, `getCommands` ordering, command grouping.

10. **Native title bar must follow the app theme, independent of the OS.** Today the window chrome follows the OS (white bar over a dark app). On startup (after `rehydrate()`) and whenever `settings.theme` changes, call the Tauri window `setTheme`: `"light"` or `"dark"` for explicit choices, `null` for "system" so it follows the OS. Check the current Tauri 2 docs for the exact API and add only the needed capability permission, commented. Verify in `tauri dev`: choose Dark on a light-OS machine and the title bar turns dark, and vice versa.

Note (not blocking): main chunk is 165 KB gzip, already ~55% of the 300 KB initial-JS budget with no features. react-hook-form left the bundle with the round-2 settings-page rewrite. Lazy-load the command palette (cmdk) and check with the bundle visualizer in M9; log in DECISIONS.md backlog.

Manual runtime checks (agent ran `tauri dev`; see Runtime evidence above):

- [x] Dark chosen on a light OS: window created hidden, shown after store load; verified
      the window appears with a dark stored theme on a light OS. The no-flash frame
      itself is not capturable headlessly.
- [ ] Resize/move window, quit, relaunch: restored.
- [x] Hand-corrupt `settings.json`: app still starts (window appeared, no hang).
- [ ] Throw inside a route component: error UI, not blank.
- [ ] Cmd/Ctrl+K opens palette, groups correct, Escape closes.
- [ ] Unknown route shows 404.
- [ ] Settings page: change theme, no inconsistent state (autosave replaces submit).

After fixes: re-run verification, update Agent report, stop. Do not push until PASS.

### Round 2 (2026-10-19): PASS

Reviewer verified: forced `turbo run lint typecheck test build` 12/12 pass; `cargo check` OK; desktop 7 files / 16 tests, api 1 test. Settings inputs bind straight to the store (RHF mirror removed) with a regression test (theme unchanged when another field changes); native title bar follows the app theme via `setTheme` (light/dark, `null` for system) and was confirmed working by the user on a real display; plugin-store load failure now warns; capability file is TOML so the permission carries a comment (accepted deviation, logged).

Remaining manual checks (user, non-blocking, run when convenient): window size/position restore; route throw shows error UI; Cmd/Ctrl+K palette grouping and Escape; unknown route shows 404; settings autosave persists across relaunch; no white flash on relaunch with Dark selected on a light OS. Any failure becomes a fix item in M2's first commits.
```

## Verification summary

- **Automated tests:** the report's lint, typecheck, test and build gates passed.
- **Agent dev-run observations:** [M1-03](../deferred-checks.md#m1-03-corrupt-settings-file-starts-with-defaults) (corrupt settings uses defaults) and [M1-04](../deferred-checks.md#m1-04-log-file-created) (log file created) — observed in `tauri dev`, not independently confirmed.
- **Manual human checks still open:** [M1-01](../deferred-checks.md#m1-01-window-theme-native-menu), [M1-05](../deferred-checks.md#m1-05-2-mb-log-rotation), [M1-06](../deferred-checks.md#m1-06-screenshot-checks).
- **Passed:** [M1-02](../deferred-checks.md#m1-02-title-bar-follows-app-theme) (user, macOS, tauri dev, 2026-10-19).
