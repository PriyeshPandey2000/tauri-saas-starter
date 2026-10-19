# M3: Authentication

**Goal:** Full auth with Better Auth: email/password + Google OAuth, session in keychain, route guards.
**Prereqs:** M2 PASS. Reviewer must approve the auth design (task 3.0) BEFORE coding the rest.

## Tasks
- [ ] 3.0 **Design note first.** Write `docs/auth-design.md` (1 page): token model (short-lived access + refresh), where each lives, deep-link OAuth sequence diagram (text), logout/revocation, failure modes. STOP and wait for reviewer OK.
- [ ] 3.0b DB connection: create `apps/api/src/db/client.ts` as the ONLY place that builds the Postgres client, reading `DATABASE_URL` (pooled; runtime) and `DATABASE_URL_DIRECT` (unpooled; used by drizzle-kit migrations only). Keep pool size small (max 5 default, configurable). Validate both vars with Zod at API startup. Add both to `.env.example`. No host-specific code (e.g. Neon-only APIs) outside this file.
- [ ] 3.1 `apps/api`: install Better Auth with Drizzle + Postgres adapter. Tables via Drizzle migrations: user, session, account, verification. Email+password and Google provider enabled. Config from env; no secrets committed.
- [ ] 3.2 API hardening: rate limit on auth routes, CORS locked to app origins, secure headers, password min length 10, email verification flag (send via a `MailerPort` stub that logs in dev).
- [ ] 3.3 Shared Zod schemas in `packages/shared`: `SessionSchema`, `UserSchema`, `SignInInput`, `SignUpInput`.
- [ ] 3.4 `AuthPort` real adapter `BetterAuthAdapter`: `signUp`, `signIn`, `signInWithOAuth(provider)`, `signOut`, `getSession`, `onAuthStateChange`, `refresh`. Tokens stored via `secureStorage` (M2.3) only.
- [ ] 3.5 OAuth via system browser: open provider URL with the opener plugin, receive callback via deep link `myapp://auth/callback` (register scheme in Tauri config; use `tauri-plugin-deep-link`). Validate `state` parameter. Use PKCE.
- [ ] 3.6 Auth state: `features/auth/store` (Zustand) mirrors port state: `loading | authenticated | unauthenticated`. On app start, restore session from keychain, refresh if expired, then resolve route guards. Never show protected UI before state resolves (render skeleton).
- [ ] 3.7 Router guards: `beforeLoad` on a `_authed` layout route redirects to `/sign-in` with `redirect` search param. `_guest` layout redirects authed users away from sign-in/up.
- [ ] 3.8 UI: sign-in, sign-up, forgot-password request page (calls API stub), account page (email, sign out, delete account button wired to API endpoint with confirm dialog). Forms use RHF + Zod, show server errors, disable while submitting.
- [ ] 3.9 apiClient integration: inject access token; on 401 attempt a single refresh then retry once; on failure sign out. No refresh stampede (single in-flight refresh promise).
- [ ] 3.10 Sign-out clears keychain entries, TanStack Query cache, and local per-user data hooks (leave a `onSignOut` registry for features).
- [ ] 3.11 Tests: auth store transitions, refresh dedupe logic, guard redirect logic, Zod schemas. API tests for sign-up/in and rate limiting.

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
_(agent fills)_

## Review
_(reviewer fills)_
