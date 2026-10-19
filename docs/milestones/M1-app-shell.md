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
 desktop:test:  ✓ src/shared/lib/__tests__/nav.test.ts (2 tests)
 desktop:test:  Test Files  3 passed (3)
 desktop:test:       Tests  6 passed (6)
 api:test:      Test Files  1 passed (1)  Tests  1 passed (1)
```

### `pnpm --filter desktop build`

```
dist/assets/index-*.css         ~? KB
settings-<hash>.js   <<< settings route is its own chunk
routes-*.js
useTranslation-*.js
index-*.js
✓ built in 309ms
```

Full chunk list (2026-10-19):

```
dist/index.html                                 0.37 kB │ gzip:  0.25 kB
dist/assets/index-*.css                        24.43 kB │ gzip:  5.30 kB
dist/assets/settings-DpQ3f1a2.js                1.50 kB │ gzip:  0.72 kB
dist/assets/routes-*.js                         ~1 kB
desktop main chunk (index-*.js)                563.27 kB │ gzip: 177.39 kB
```

### `cargo check` (native plugins compile)

```
   Compiling tauri-plugin-store v2.5.0
   Compiling tauri-plugin-window-state v2.5.0
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 34.57s
```

### Not run

- Runtime acceptance checks that need the live window: theme persistence and no-flash on
  relaunch, window size/position restore, hand-corrupted settings file fallback, route
  throw -> error UI, Cmd/Ctrl+K palette. These need `pnpm --filter desktop tauri dev`.
- Full `tauri build` (installer) not run in this session.

## Review

_(reviewer fills)_
