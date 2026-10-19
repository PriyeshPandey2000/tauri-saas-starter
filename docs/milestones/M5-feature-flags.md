# M5: Feature Flags

**Goal:** Remote-controlled flags with safe local fallback, kill switches, and easy use in UI and logic.
**Prereqs:** M4 PASS.

## Design
- Flags are declared once in a typed registry: key, type (boolean | string variant), default, description, owner.
- Resolution order: **local dev override > remote (PostHog) > registry default.**
- If remote is unreachable, use last cached values from disk, then registry defaults. App must never block on flags.
- Flags are evaluated per user (identify with auth user id after sign-in; reset on sign-out).

## Tasks
- [ ] 5.1 `packages/shared/flags.ts`: `FLAG_REGISTRY` as a const object with Zod-derived types. Example flags: `newDashboard` (bool, false), `betaExport` (bool, false), `checkoutVariant` ("a"|"b", "a"), `killSwitchSync` (bool, false). `FlagKey` type derived from registry keys.
- [ ] 5.2 Finalize `FeatureFlagPort`: `init(userId?)`, `get<K extends FlagKey>(key): FlagValue<K>`, `getAll()`, `refresh()`, `subscribe(cb)`, `reset()`. Synchronous `get` (reads in-memory snapshot).
- [ ] 5.3 `PostHogFlagAdapter`: loads flags on init, bootstraps from disk cache first for instant start, refreshes in background, subscribes to changes. Vendor SDK imported only here. Needs `VITE_POSTHOG_KEY` / host from config; if missing, adapter is skipped and registry defaults apply (log a warning once).
- [ ] 5.4 `LocalOverrideAdapter` (decorator): reads overrides from a JSON object stored in settings (dev/staging only; disabled when `VITE_APP_ENV=prod`). Wraps any other adapter.
- [ ] 5.5 Disk cache: last known remote values persisted via plugin-store, validated with Zod against registry; unknown keys dropped.
- [ ] 5.6 React API: `useFlag(key)` (uses `useSyncExternalStore`, re-renders only for that key), `<Flag name="x" fallback={...}>children</Flag>` for boolean flags, `<FlagVariant name="checkoutVariant" cases={{a:..., b:...}} />`.
- [ ] 5.7 Non-React access: `flags.get(key)` for use in route `beforeLoad` and services. Add route-level gating example: a `/beta-export` route that redirects when `betaExport` is off.
- [ ] 5.8 Identify/reset wiring: on auth state change call `init(userId)` / `reset()` through the auth store subscription (not inside auth feature; wire in `app/` composition code to keep features isolated).
- [ ] 5.9 Dev panel: in non-prod, a "Flags" page under Settings listing every flag with current value, source (override/remote/default), and a toggle to set/clear local overrides.
- [ ] 5.10 Kill switch demo: wrap the notes remote-sync call (M4.7) with `killSwitchSync`; when on, remote calls are skipped and UI shows a banner.
- [ ] 5.11 Lint rule or test: fail if code references a flag key string not in the registry (TS types should already enforce; add a test scanning for `useFlag("` literals).
- [ ] 5.12 Docs `docs/feature-flags.md`: how to add a flag, naming (`camelCase`, no negatives like `disableX`), lifecycle (add -> rollout -> remove), cleanup rule: every flag has an owner and removal date comment.
- [ ] 5.13 Tests: resolution order, offline fallback to cache then defaults, override ignored in prod, `useFlag` re-render isolation, variant rendering.

## Acceptance criteria
- With network off and no cache: app starts instantly using defaults.
- With cache and network off: cached values are used.
- Toggling a flag in PostHog changes UI without restart (within refresh interval).
- Override works in dev, is ignored when `VITE_APP_ENV=prod` (test proves).
- Adding a new flag takes only registry edit + usage (document with a worked example).
- Tests, lint, typecheck green.

## Out of scope
Experiments/A-B analysis, percentage rollouts UI (handled in PostHog), server-side flag evaluation.

## Verification commands
```
pnpm lint && pnpm typecheck && pnpm test
grep -rn "posthog" apps/desktop/src | grep -v "ports/adapters"   # must be empty
```

## Review checklist
- [ ] No vendor import outside adapter.
- [ ] `get` never async/blocking; app start not delayed by network.
- [ ] Overrides impossible in prod.
- [ ] Registry is single source of truth; types derived.
- [ ] Flag cleanup lifecycle documented.

## Agent report
_(agent fills)_

## Review
_(reviewer fills)_
