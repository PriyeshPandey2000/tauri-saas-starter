# M1: App Shell

**Goal:** Navigable app skeleton with theming, settings, window persistence, error handling.
**Prereqs:** M0 PASS.

## Tasks
- [ ] 1.1 Install TanStack Router with file-based routing plugin for Vite. Routes in `src/routes/`. Add `__root.tsx`, `index.tsx`, `settings.tsx`, `404` (notFoundComponent).
- [ ] 1.2 Install TanStack Query. Create `app/providers.tsx` wrapping `QueryClientProvider` with sane defaults (staleTime 30s, retry 2, refetchOnWindowFocus true). Provide router context with `queryClient`.
- [ ] 1.3 Layout: `app/layout/AppShell.tsx` with sidebar (collapsible) + top bar + content outlet. Sidebar items come from a typed registry `shared/lib/nav.ts` so features can register entries (do not hardcode in the component).
- [ ] 1.4 Theming: light/dark/system. Store preference, apply `class="dark"` on `<html>` before first paint (inline script or early effect) to avoid flash. Follow OS changes when "system".
- [ ] 1.5 Settings store (Zustand + persist) in `features/settings/`. Schema defined with Zod in `packages/shared` (`AppSettingsSchema`): theme, language, sidebarCollapsed, telemetryConsent (default `unset`). Persist through Tauri `plugin-store` (file in app data dir), NOT localStorage. Validate on load, fall back to defaults on invalid data.
- [ ] 1.6 Settings page: theme selector, language selector (stub with `en` only), sidebar toggle. Use React Hook Form + Zod.
- [ ] 1.7 i18next set up with `en` namespace files in `shared/i18n/locales/en/`. All visible strings in new UI go through `t()`.
- [ ] 1.8 Window state persistence via `tauri-plugin-window-state`. Window remembers size/position.
- [ ] 1.9 Error handling: route-level `errorComponent`, a global `ErrorBoundary` in providers, and a friendly full-page fallback with "Reload" button. Unhandled promise rejection + `window.onerror` log to console (logger comes in M2).
- [ ] 1.10 Toast system (shadcn `sonner`) mounted once in providers.
- [ ] 1.11 Command palette (shadcn `cmdk`): Ctrl/Cmd+K opens, lists nav entries and a "Toggle theme" action from a registry `shared/lib/commands.ts`.
- [ ] 1.12 Splash/skeleton: app renders shell skeleton immediately; no blank white window on launch.
- [ ] 1.13 Route-level code splitting enabled (autoCodeSplitting). Confirm settings route is a separate chunk.

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
_(agent fills)_

## Review
_(reviewer fills)_
