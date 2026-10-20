# Feature flags

Flags are declared once in `packages/shared/src/flags.ts`. The registry is the
single source of truth for keys, value types, defaults, owners and removal
dates; TypeScript derives `FlagKey` and `FlagValue<K>` from it.

## Resolution order

1. **Local override** (dev and staging only, never in production)
2. **Remote** (PostHog `/flags?v=2`)
3. **Disk cache** (last remote values for this user or install)
4. **Registry default**

`FeatureFlagPort.get` is synchronous. The app starts with registry defaults,
then `init()` applies the per-user cache, then refreshes in the background with
a 3-second timeout and a 5-minute interval. Startup never waits on the network.

## Consent

Even anonymous evaluation is a network request: until
`settings.telemetryConsent` is `"granted"` the adapter sends the random
per-install id (`anon:<uuid>`) as `distinct_id` to PostHog, which also sees the
client IP. It sends no person properties (PostHog autocapture is not used at
all — the app talks to the REST endpoint, not the JS SDK), never the auth user
id, and no `$feature_flag_called` exposure events.

`VITE_FLAGS_REQUIRE_CONSENT` defaults to **`true`**: all PostHog requests are
skipped until consent is granted, and flags resolve from the per-install cache or
registry defaults. Set it to `false` only when kill switches must reach users who
have not consented (anonymous evaluation then contacts PostHog with the install
id).

After consent is granted, the adapter identifies with the auth user id and
sends one exposure event per flag per session. Revoking consent stops
identification immediately: the next request uses the anonymous id again and
the exposure set is cleared. Nothing is requested before `init()` has loaded
the install id, so a consent toggle at boot cannot produce an `anon:unknown`
request. Consent is read from the existing settings store and wired in
`apps/desktop/src/app/feature-flags-wiring.ts`.

The CSP builder (`apps/desktop/scripts/csp.mjs`) adds the PostHog origin to
`connect-src` only when `VITE_POSTHOG_KEY` is set; the dev server origins are
dev-only.

## Caching

`flags.json` (plugin-store) holds:

```json
{
  "installId": "<uuid>",
  "entries": { "user:<id>": { "betaExport": true }, "anon:<id>": {} }
}
```

The adapter reads only the current key. `reset()` (sign-out, or any change of
user) deletes that user's entry and falls back to the anonymous install. The
file is validated with Zod, and only keys in the registry survive parsing, so
unknown or stale flags are dropped.

## Local overrides

`LocalOverrideAdapter` wraps the remote adapter and stores overrides under
`flagOverrides` in `settings.json`. `canOverride()` is false when
`VITE_APP_ENV=prod`; `setOverride` then logs a warning and does nothing, and the
dev route redirects away. The dev panel lives at `/settings/flags` (nav item
only outside production) and shows every flag with its value and source
(`override`, `remote`, `default`), plus toggle/clear controls.

## Adding a flag

1. Add an entry to `FLAG_REGISTRY` in `packages/shared/src/flags.ts` with
   `schema`, `default`, `description`, `owner` and `removeBy` (an ISO date, the
   removal deadline). Use `camelCase`, positive names (`betaExport`, never
   `disableExport`).
2. Add the same key to `DEFAULT_FLAGS` (TypeScript forces this).
3. Use it: `useFlag("betaExport")`, `<Flag name="betaExport">`, or
   `<FlagVariant name="checkoutVariant" cases={{ a: ..., b: ... }} />`. Outside
   React call `ports.featureFlags.get("betaExport")`.
4. Create the flag in PostHog with the same key (boolean or multivariate).
5. Run the tests: the registry scan fails on a `useFlag("...")` literal that is
   not declared.

## Removing a flag

1. Delete the key from `FLAG_REGISTRY` and `DEFAULT_FLAGS`; TypeScript reports
   every remaining usage.
2. Remove the usage (keep the winning behavior as the default).
3. Delete the flag in PostHog.
4. Remove the cache entry naturally on the next user reset; old keys are
   already ignored by the registry parser.

Every flag must have an `owner` and a `removeBy` date. Treat the date as a
deadline: ship the cleanup PR in the same release cycle, or update the date with
the owner's name in the PR description.

## Kill switch

`killSwitchSync` wraps the remote notes repository. While it is on, every
remote call throws before the network is touched and the notes page shows a
banner. Local SQLite notes keep working. A kill switch is a normal boolean flag,
so it still resolves from cache when offline.
