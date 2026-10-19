# M3: Authentication

**Goal:** Full auth with Better Auth: email/password + Google OAuth, session in keychain, route guards.
**Prereqs:** M2 PASS. Reviewer must approve the auth design (task 3.0) BEFORE coding the rest.

## Tasks

- [x] 3.0 **Design note first.** Write `docs/auth-design.md` (1 page): token model (short-lived access + refresh), where each lives, deep-link OAuth sequence diagram (text), logout/revocation, failure modes. STOP and wait for reviewer OK.
- [x] 3.0b DB connection: create `apps/api/src/db/client.ts` as the ONLY place that builds the Postgres client, reading `DATABASE_URL` (pooled; runtime) and `DATABASE_URL_DIRECT` (unpooled; used by drizzle-kit migrations only). Keep pool size small (max 5 default, configurable). Validate both vars with Zod at API startup. Add both to `.env.example`. No host-specific code (e.g. Neon-only APIs) outside this file.
- [x] 3.1 `apps/api`: install Better Auth with Drizzle + Postgres adapter. Tables via Drizzle migrations: user, session, account, verification. Email+password and Google provider enabled. Config from env; no secrets committed.
- [x] 3.2 API hardening: rate limit on auth routes, CORS locked to app origins, secure headers, password min length 10, email verification flag (send via a `MailerPort` stub that logs in dev).
- [x] 3.3 Shared Zod schemas in `packages/shared`: `SessionSchema`, `UserSchema`, `SignInInput`, `SignUpInput`.
- [x] 3.4 `AuthPort` real adapter `BetterAuthAdapter`: `signUp`, `signIn`, `signInWithOAuth(provider)`, `signOut`, `getSession`, `onAuthStateChange`, `refresh`. Tokens stored via `secureStorage` (M2.3) only.
- [x] 3.5 OAuth via system browser: open provider URL with the opener plugin, receive callback via deep link `myapp://auth/callback` (register scheme in Tauri config; use `tauri-plugin-deep-link`). Validate `state` parameter. Use PKCE.
- [x] 3.6 Auth state: `features/auth/store` (Zustand) mirrors port state: `loading | authenticated | unauthenticated`. On app start, restore session from keychain, refresh if expired, then resolve route guards. Never show protected UI before state resolves (render skeleton).
- [x] 3.7 Router guards: `beforeLoad` on a `_authed` layout route redirects to `/sign-in` with `redirect` search param. `_guest` layout redirects authed users away from sign-in/up.
- [x] 3.8 UI: sign-in, sign-up, forgot-password request page (calls API stub), account page (email, sign out, delete account button wired to API endpoint with confirm dialog). Forms use RHF + Zod, show server errors, disable while submitting.
- [x] 3.9 apiClient integration: inject access token; on 401 attempt a single refresh then retry once; on failure sign out. No refresh stampede (single in-flight refresh promise).
- [x] 3.10 Sign-out clears keychain entries, TanStack Query cache, and local per-user data hooks (leave a `onSignOut` registry for features).
- [x] 3.11 Tests: auth store transitions, refresh dedupe logic, guard redirect logic, Zod schemas. API tests for sign-up/in and rate limiting.

## Acceptance criteria

- Sign up, sign in, sign out, relaunch (session restored), expired access token auto-refreshes.
- Google OAuth round-trip works via browser and deep link on at least one OS; mismatched `state` is rejected.
- Tokens exist only in keychain (grep for localStorage/sessionStorage in auth code returns nothing).
- Visiting protected route when logged out redirects and returns after login.
- Two parallel 401s trigger only one refresh call (test proves).
- Lint, typecheck, tests green.

## Out of scope

Roles/teams, MFA, magic links, billing, any other providers.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter api test
grep -rn "localStorage\|sessionStorage" apps/desktop/src/features/auth   # must be empty
```

## Review checklist

- [ ] PKCE + state validated; redirect URIs allowlisted server-side.
- [ ] No secrets in repo; `.env.example` updated.
- [ ] Refresh logic race-free.
- [ ] UI never flashes protected content.
- [ ] Vendor SDK imported only inside the adapter.

## Agent report

## Agent report

Design: `docs/auth-design.md` revised per review (`545f8cc`). Order: 3.0, 3.0b, 3.1,
3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11.

Commits (`Refs: M3.n`):

- `545f8cc` M3.0 design revision: PKCE between app and API, 30-day absolute cap,
  linking rule, requireAuth, per-OS CORS, config-driven CSP, scheme rename.
- `714dcfa` M3.0b env schema + the single Postgres client (pool max 5) and the
  drizzle-kit config using `DATABASE_URL_DIRECT`.
- `725c7bd` M3.1 Better Auth + Drizzle adapter, email/password + Google,
  bearer/jwt/one-time-token plugins, core + `jwks` tables and migration, session
  hooks, logging mailer.
- `7572dad` M3.2 hardening: CORS allowlist, secure headers, rate-limit rules,
  password min 10, verification flag.
- `93f2a36` M3.3 shared `Session`, `User`, `SignInInput`, `SignUpInput` schemas.
- `c14bb56` M3.4 `BetterAuthAdapter`: keychain session/JWT, sign-up/in, restore,
  single-flight refresh, OAuth start/exchange, listeners, delete account.
- `b2aa29d` M3.5 `/auth/desktop/{start,callback,exchange}` with PKCE checks,
  `requireAuth` (JWKS + 30s leeway) and `/api/me`; Tauri opener/deep-link plugins,
  `tauri-saas-starter` scheme, capabilities, listener.
- `988efb3` M3.6 auth store, session restore, deep-link bridge.
- `390fcfc` M3.7 `_authed`/`_guest` guards with `redirect` search param.
- `0887743` M3.8 sign-in, sign-up, forgot-password, account pages with RHF + Zod.
- `16bc832` M3.9 apiClient token injection + one refresh + single retry.
- `0738d8a` M3.10 sign-out registry; main clears the query cache.
- `f586ce3` M3.11 tests.
- `e62e305`/`9c640e1` CSP generator and `docs/auth-setup.md`.

### Verification output (2026-10-19)

```
pnpm lint        -> OK; check-vendor-imports: OK
pnpm typecheck   -> 3 successful, 3 total
pnpm test        -> desktop 17 files / 59 tests passed; api 1 file / 1 test passed
pnpm --filter api test -> 3 files / 12 tests passed
pnpm --filter desktop build -> ✓ built in 656ms; main 598.07 kB (gzip 187.98 kB)
cargo test       -> 3 passed; 1 ignored (keychain_roundtrip)
grep -rn "localStorage|sessionStorage" apps/desktop/src/features/auth -> no output
grep -rn "invoke(" apps/desktop/src | grep -v bindings.ts -> no output
```

`tauri dev` starts with the generated CSP config (`node scripts/tauri.mjs dev`):
Vite on 1420, cargo built, `target/debug/appsdesktop` ran.

API tests use Better Auth's memory adapter: sign-up + sign-in, rate limiting (429),
wrong verifier, replayed OTT, expired challenge, 30-day clamp, linking predicate.
Desktop tests cover guard redirects, store transitions, refresh dedupe, state
mismatch, and the Zod schemas.

### Not run

- Real Postgres migration (`db:migrate`) and the pooled/direct URLs: no database in
  this environment; the SQL is generated and committed.
- Google OAuth round-trip: needs Google credentials, a browser session, and on
  macOS a bundled app in `/Applications` (deep links do not work in `tauri dev`).
- Real keychain round-trip (user-run ignored test from M2).
- Windows/macOS CORS + deep-link behaviour on real machines.
- Installer build.

### Notes for review

- The design's start step needed one extra thin route, `GET
/auth/desktop/start`, because Better Auth's `/sign-in/social` is POST-only and the
  OAuth state cookie must be created in the system browser, not the WebView.
- `{ott -> challenge}` uses a single-process TTL map; fine for the boilerplate's one
  API instance, logged as a follow-up for multi-instance deployments.
- The account-linking hook is DB-backed; its policy is unit-tested through
  `shouldBlockImplicitLink` (verified credential user allows, unverified blocks,
  Google-only allows).
- Main JS gzip is 187.98 kB after auth pages + RHF, approaching the 300 kB M9 budget;
  noted for M9.

### Round 2 fixes (review items 1-10)

- `a91c226` M3.12 real response shapes: sign-in/sign-up parse `{token,user}` with the
  shared `UserSchema`, then read expiry from `get-session`. Added a contract test
  driving the real adapter against the live Hono app + Postgres (PGlite): sign-up,
  sign-in, restore, token mint, `/api/me`, sign-out, no response mocks.
- `7994d48` M3.13 30-day cap: a `hooks.before` on `/token` and `/get-session` looks
  up the bearer/cookie session and rejects it past 30 days. Test ages a real
  session row by 31 days and asserts both endpoints return 401.
- `4444cc5` M3.14 API serves through `@hono/node-server`; test shows two
  `Set-Cookie` values survive on the live server.
- `457c50e` M3.15 `docker-compose.yml` (postgres:17, volume, healthcheck) plus
  `db:up`/`db:down`/`db:reset`; API tests moved to PGlite with the committed
  migrations and the real Drizzle adapter. Local/hosted DB docs updated.
- `a8e2f44` M3.16 `getSession` only clears on 401; 5xx/429/network fall back to the
  cached user + expiry and retry later. Tests cover 503, network failure, 401.
- `5408300` M3.17 `/auth/desktop/*` rate limited (30/min); the per-instance memory
  limit is documented for Better Auth and this limiter.
- `1db594e` M3.18 `{ott -> challenge}` moved to `verification`, keyed by
  `sha256(ott)`, single use, TTL 3 minutes.
- `631eca6` M3.19 dev CORS origin only outside production, `set-auth-token` exposed,
  `jwtVerify` pinned to EdDSA; CORS tests added.
- `32f4c84` M3.20 bogus deep links no longer consume the pending OAuth flow; test
  proves a mismatched state leaves the flow usable.
- `77e15d4` M3.21 API `typescript` pinned to `~6.0.3`.

### Verification output (2026-10-19, after round 2)

```
pnpm lint        -> OK; check-vendor-imports: OK
pnpm typecheck   -> 3 successful, 3 total
pnpm test        -> desktop 17 files / 63 tests; api 1 file / 1 test
pnpm --filter api test -> 7 files / 17 tests
pnpm --filter desktop build -> built in 807ms; main 598.99 kB (gzip 188.23 kB)
cargo test       -> 3 passed; 1 ignored (keychain_roundtrip)
```

The API suite now runs on PGlite with the committed migrations and the real Drizzle
adapter, including the contract test, the 30-day cap, the linking policy, rate
limiting, PKCE rejection, and multi-cookie handling.

### Not run

- `pnpm --filter api db:migrate` against the compose database: the Docker daemon is
  not running (`docker info` exits 1). Start Docker Desktop/OrbStack, run `pnpm
db:up`, then `pnpm --filter api db:migrate`.
- Google OAuth round-trip (credentials + bundled macOS app required).
- Real keychain round-trip; Windows deep link/CORS behaviour; installer build.

## Review

**Verdict: CHANGES REQUIRED** (2026-10-19). The design (token split, app<->API PKCE, state, OTT, requireAuth) is implemented faithfully and the unit tests pass, but they ran on Better Auth's in-memory adapter with mocked response shapes, so four defects that only show up end to end were missed. Two are security controls that silently do nothing.

Verified by reviewer: forced gates pass; PKCE verifier/challenge logic (S256, constant-time compare, single-use, TTL) is correct on both sides; desktop state check is single-use and constant-time; tokens only in the keychain; access JWT verified via JWKS with issuer/audience/leeway; CORS origins exact (macOS + Windows tauri origins); CSP generated from `VITE_API_URL` by `scripts/tauri.mjs`.

Must fix (found by reading code and Better Auth 1.7.11 sources):

1. **Email sign-in/sign-up cannot work against the real API.** `sign-in/email` returns `{ redirect, token, user }` and `sign-up/email` returns `{ token, user }`; neither has a `session` object. The desktop adapter parses them with `RemoteSessionSchema` (requires `session.token` and `session.expiresAt`), so `signIn` always throws "Sign-in did not return a session" and `signUp` always reports `verification_required`. Unit tests passed because mocks used the assumed shape. Fix: parse the real shapes (use the shared Zod schemas from `packages/shared`, not local copies), then fetch expiry via `get-session` with the bearer token. Add a contract test that wires the real adapter to the real in-process Hono app (`fetchImpl: (url, init) => app.fetch(new Request(url, init))`) and runs sign-up, sign-in, get-session, token mint, `/api/me`, sign-out with no hand-written response mocks.
2. **The 30-day absolute session cap is not enforced.** In Better Auth, `updateWithHooks` calls `hooks.session.update.before(data, context)` with only the update payload (`{expiresAt, updatedAt}`); the token is the `where`, not in `data`. `session.token` is therefore always undefined in the `update.before` hook and it returns early, so rolling refresh extends sessions forever. The hook also returns early whenever `db` is omitted, which is how every test ran. Fix: enforce the cap in a way that works (e.g. check `session.createdAt + 30d` when minting access tokens / reading the session, or a hook that looks up by the right key), and prove it with a test on a real database: age a session past 30 days, call refresh/get-session, assert it is rejected or capped.
3. **Multiple `Set-Cookie` headers are collapsed.** `apps/api/src/index.ts` hand-rolls the Node adapter and uses `Object.fromEntries(resp.headers.entries())`, which keeps only the last `Set-Cookie` (verified in Node). Better Auth sets more than one cookie on social sign-in, so the OAuth state cookie can be lost and the Google flow fails with a state mismatch. Replace with `@hono/node-server` (latest stable, log it) and add a test that two `Set-Cookie` values survive. This also fixes the host/URL construction and body handling of the hand-rolled version.
4. **Nothing ran against Postgres.** No `docker-compose.yml`, no `db:*` scripts, no PGlite; migrations were never executed. Add the compose file and root scripts (`db:up`, `db:down`, `db:reset`), run `db:migrate` against it, and run the API tests (including 2 and the linking hook) against PGlite with the same migrations, so they exercise the real Drizzle adapter and the `db` hooks. The user has Docker installed but the daemon is not running; start it before the compose steps.

Should fix: 5. `getSession` clears credentials on ANY non-OK response, so a 5xx or 429 at startup signs the user out. Only 401 may clear. On a network failure at startup with a stored session token and cached `auth.user`, treat the user as authenticated (offline) and retry later, as the design note specifies. 6. Rate limiting does not cover `/auth/desktop/*` (Better Auth's rules only apply under `/api/auth/*`). Add a limiter for start/callback/exchange. Document that Better Auth's default rate-limit storage is per-instance memory and switch to `storage: "database"` or document the single-instance constraint. 7. The `{ott -> challenge}` store is in-process memory: it breaks with more than one API instance or a restart inside the 3-minute window, and keys are raw OTTs. Prefer storing it in the `verification` table keyed by a hash of the OTT; otherwise document the single-instance constraint prominently in docs/auth-setup.md. 8. `DEV_ORIGINS` (`http://localhost:1420`) should be allowed only when not in production; add `exposeHeaders: ["set-auth-token"]` to CORS; pass `algorithms: ["EdDSA"]` to `jwtVerify`. 9. A bogus `tauri-saas-starter://auth/callback` link clears the user's pending OAuth state before validating it; only consume the pending state when the link's `state` matches (still single use). 10. `apps/api/package.json` has `"typescript": "^6.0.3"`; pin `~6.0.3` like the rest of the repo (typescript-eslint peer range is `<6.1.0`).

Notes (not blocking): `tauri.conf.json` still contains the static dev CSP; releases must go through `scripts/tauri.mjs` (M9 `tauri-action` must call it). Google round-trip and Windows origin checks need the user and a built app.

### Round 2 (2026-10-19): PASS with three small follow-ups, gated on a real-Postgres migration

Reviewer verified: all 10 items addressed. Real response shapes parsed via shared schemas and a contract test runs the real adapter against the live Hono app on PGlite; the 30-day cap is enforced by an auth `hooks.before` on `/token` and `/get-session` (the hook that cannot work is gone); `@hono/node-server` replaces the hand-rolled adapter; challenge storage moved to the `verification` table keyed by `sha256(ott)`; only a 401 clears credentials; CORS/JWT hardening in place; compose + `db:*` scripts exist.

Follow-ups (first commits, small):

1. **Flaky test.** The forced full run failed once (`auth.test.ts` "signs up and signs in") while lint/build ran in parallel; it passed 5 of 5 reruns alone and in full runs. PGlite startup plus password hashing under CPU contention exceeds vitest's default 5 s. Set an explicit `testTimeout`/`hookTimeout` (e.g. 30 s) in `apps/api/vitest.config.ts`, and reuse one PGlite instance per file where possible.
2. **Rate limiter key is spoofable.** `/auth/desktop/*` keys on the first `x-forwarded-for` value, which a client can set freely. Add a `TRUSTED_PROXY_HEADER` env (e.g. `fly-client-ip`); when unset, use the socket address from `@hono/node-server` `getConnInfo`, and ignore `x-forwarded-for`. Document it in docs/auth-setup.md and add a test that a spoofed header does not change the bucket.
3. **Challenge store hygiene.** `take` selects then deletes, so two concurrent exchanges can both read the row. Use `DELETE ... RETURNING` (atomic). Also delete expired `desktop-pkce:*` rows opportunistically (on `set`).

Gate (user): start Docker (Docker Desktop or OrbStack), run `pnpm db:up` then `pnpm --filter api db:migrate`; the migration has only ever run on PGlite. Google OAuth round-trip and Windows origin checks remain later user checks.
