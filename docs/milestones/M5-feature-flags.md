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

**Verdict: PASS after one small round** (2026-10-20). Design is clean: synchronous port, registry as single source of truth, per-user/anonymous disk cache validated with Zod, consent-gated identification and exposure events, background refresh with timeout, prod-proof overrides, kill switch and route gate, and `flags` removed from the query-cache allowlist. Forced `turbo run lint typecheck test build` 12/12 (desktop 93 tests, api 28).

Fix in one commit:

1. **CSP blocks PostHog in the real app.** `apps/desktop/scripts/tauri.mjs` builds `connect-src` from the API origin only, so `POST {host}/flags?v=2` and `/i/v0/e/` are blocked by the webview CSP; flags would silently stay on defaults. When `VITE_POSTHOG_KEY` is set, add the PostHog origin (`VITE_POSTHOG_HOST`, default `https://us.i.posthog.com`) to `connect-src`. Extract the CSP builder into a function and unit test it (with and without the key, dev and prod).
2. **Boot ordering.** `initializeFeatureFlags` calls `setConsent()` before `init()`. With consent true, `setConsent` triggers a refresh and `get()` can capture exposure before `init` has loaded the install id, so requests and exposure events use the shared id `anon:unknown`. Never refresh or capture until `init` has completed and `installId` is set; queue consent and apply it after init. Add a test: consent granted before init sends no request and no event with `anon:unknown`.
3. Remove the `user-agent` header from the `/flags` request (browsers ignore it; the comment is misleading).
4. docs/feature-flags.md: state plainly that even anonymous evaluation sends the install id and the client IP to PostHog, and that identification and exposure events wait for consent. Add an optional `VITE_FLAGS_REQUIRE_CONSENT=true` that skips all PostHog requests until consent is granted (default false), with a test.

Human checks (add to docs/deferred-checks.md): real `VITE_POSTHOG_KEY`; create `betaExport` in PostHog and confirm a dashboard rule change reaches a built app within the refresh interval; confirm the flags request is not blocked by the CSP in a built app.

### Review fix round (2026-10-20)

1. `apps/desktop/scripts/csp.mjs` now builds the CSP; it adds the PostHog origin only when `VITE_POSTHOG_KEY` is set (host from `VITE_POSTHOG_HOST`, default US cloud) and keeps the dev origins dev-only. Four unit tests cover key/no-key and dev/prod.
2. The adapter has an `initialized` gate: `refresh` and exposure capture do nothing until `init` has loaded `installId`; `setConsent` only queues when not initialized. Tests prove that consent granted before init sends no request (and never `anon:unknown`) and that `VITE_FLAGS_REQUIRE_CONSENT=true` sends nothing until consent.
3. The `user-agent` header is gone from the `/flags` request.
4. `docs/feature-flags.md` states that anonymous evaluation sends the install id and client IP to PostHog, and documents `VITE_FLAGS_REQUIRE_CONSENT` (default false).

Verification: `turbo run lint typecheck build` 10/10; forced tests 27 files / 99 desktop, 9 / 28 API; `cargo test` 3 passed, 1 ignored.
