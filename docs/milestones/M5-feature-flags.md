# M5: Feature Flags

**Goal:** Remote-controlled flags with safe local fallback, kill switches, and easy use in UI and logic.
**Prereqs:** M4 PASS.

## Design

- Flags are declared once in a typed registry: key, type (boolean | string variant), default, description, owner.
- Resolution order: **local dev override > remote (PostHog) > registry default.**
- If remote is unreachable, use last cached values from disk, then registry defaults. App must never block on flags.
- Flags are evaluated per user (identify with auth user id after sign-in; reset on sign-out).

## Tasks

- [x] 5.1 `packages/shared/flags.ts`: `FLAG_REGISTRY` as a const object with Zod-derived types. Example flags: `newDashboard` (bool, false), `betaExport` (bool, false), `checkoutVariant` ("a"|"b", "a"), `killSwitchSync` (bool, false). `FlagKey` type derived from registry keys.
- [x] 5.2 Finalize `FeatureFlagPort`: `init(userId?)`, `get<K extends FlagKey>(key): FlagValue<K>`, `getAll()`, `refresh()`, `subscribe(cb)`, `reset()`. Synchronous `get` (reads in-memory snapshot).
- [x] 5.3 `PostHogFlagAdapter`: loads flags on init, bootstraps from disk cache first for instant start, refreshes in background, subscribes to changes. Vendor SDK imported only here. Needs `VITE_POSTHOG_KEY` / host from config; if missing, adapter is skipped and registry defaults apply (log a warning once).
- [x] 5.4 `LocalOverrideAdapter` (decorator): reads overrides from a JSON object stored in settings (dev/staging only; disabled when `VITE_APP_ENV=prod`). Wraps any other adapter.
- [x] 5.5 Disk cache: last known remote values persisted via plugin-store, validated with Zod against registry; unknown keys dropped.
- [x] 5.6 React API: `useFlag(key)` (uses `useSyncExternalStore`, re-renders only for that key), `<Flag name="x" fallback={...}>children</Flag>` for boolean flags, `<FlagVariant name="checkoutVariant" cases={{a:..., b:...}} />`.
- [x] 5.7 Non-React access: `flags.get(key)` for use in route `beforeLoad` and services. Add route-level gating example: a `/beta-export` route that redirects when `betaExport` is off.
- [x] 5.8 Identify/reset wiring: on auth state change call `init(userId)` / `reset()` through the auth store subscription (not inside auth feature; wire in `app/` composition code to keep features isolated).
- [x] 5.9 Dev panel: in non-prod, a "Flags" page under Settings listing every flag with current value, source (override/remote/default), and a toggle to set/clear local overrides.
- [x] 5.10 Kill switch demo: wrap the notes remote-sync call (M4.7) with `killSwitchSync`; when on, remote calls are skipped and UI shows a banner.
- [x] 5.11 Lint rule or test: fail if code references a flag key string not in the registry (TS types should already enforce; add a test scanning for `useFlag("` literals).
- [x] 5.12 Docs `docs/feature-flags.md`: how to add a flag, naming (`camelCase`, no negatives like `disableX`), lifecycle (add -> rollout -> remove), cleanup rule: every flag has an owner and removal date comment.
- [x] 5.13 Tests: resolution order, offline fallback to cache then defaults, override ignored in prod, `useFlag` re-render isolation, variant rendering.

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

**Status: complete (2026-10-20). Awaiting review.**

### What shipped

- **5.1 Registry.** `packages/shared/src/flags.ts` declares `newDashboard`, `betaExport`,
  `checkoutVariant` and `killSwitchSync` with Zod schemas, defaults, descriptions,
  owners and `removeBy` dates. `FlagKey`, `FlagValue<K>`, `FlagValues`,
  `BooleanFlagKey` and `VariantFlagKey` are all derived from it.
- **5.2 Port.** `FeatureFlagPort` is now synchronous: `get`, `getAll`, `getSource`,
  `refresh`, `subscribe`, `init(userId?)`, `reset`, plus `setConsent`,
  `canOverride`, `setOverride`, `clearOverride`, `clearOverrides`. The noop adapter
  and the ports test use the new shape.
- **5.3 Adapter.** `PostHogFlagAdapter` (under `ports/adapters/flags/`, no vendor
  import) calls `POST {host}/flags?v=2` and parses the response with Zod. Missing
  `VITE_POSTHOG_KEY` skips it, logs one warning, and uses registry defaults.
- **5.4/5.9 Overrides.** `LocalOverrideAdapter` persists `flagOverrides` in
  `settings.json`, decorates the remote adapter, and refuses writes when
  `VITE_APP_ENV=prod`. `/settings/flags` lists every flag with value and source and
  offers toggle/clear; the route redirects in production and the nav item is
  non-prod only.
- **5.5 Cache.** `flags.json` holds `{ installId, entries }`; entries are keyed by
  `user:<id>` or `anon:<installId>`. Zod validates the file; only registry keys
  survive. `reset()` deletes the signed-out user's entry.
- **5.6 React API.** `useFlag` uses `useSyncExternalStore`; `<Flag>` and
  `<FlagVariant>` are typed to boolean and variant keys.
- **5.7 Non-React access.** `/beta-export` gates in `beforeLoad` with
  `ports.featureFlags.get("betaExport")` and redirects when off.
- **5.8/consent wiring.** `app/feature-flags-wiring.ts` reads auth and consent,
  calls `init`/`reset` on user changes, `setConsent` on settings changes, and
  registers `onSignOut`. Nothing lives in the auth feature.
- **5.10 Kill switch.** Every remote notes repository method checks
  `killSwitchSync` before the network; the notes page shows a banner when remote
  source and switch is on.
- **5.11 Scan test** fails on any `useFlag("...")` literal outside the registry.
- **5.12/5.13** `docs/feature-flags.md` covers adding/removing flags, naming,
  lifecycle and consent; tests cover resolution order, offline fallback, per-user
  cache isolation, consent gating, production overrides, re-render isolation,
  variants and the registry scan.

### Verification

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  26 passed (26)
desktop:test:       Tests  93 passed (93)
api:test:  Test Files  9 passed (9)
api:test:       Tests  28 passed (28)
 Tasks:    2 successful, 2 total

$ cd apps/desktop/src-tauri && cargo test
running 4 tests
test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

$ grep -rn "posthog" apps/desktop/src | grep -v "ports/adapters"
(empty)

$ pnpm db:up
$ DB_PORT=5433 DATABASE_URL_DIRECT="postgres://app:app@127.0.0.1:5433/app" pnpm --filter api db:migrate
[✓] migrations applied successfully!

$ pnpm --filter api test
 Test Files  9 passed (9)
      Tests  28 passed (28)
```

No dependency was added: PostHog evaluation uses its REST `/flags` endpoint instead
of `posthog-js` (see `docs/DECISIONS.md` for the size rationale).

## Review

_(reviewer fills)_
