# Auth design (M3)

Status: **approved with changes (2026-10-19).** Reviewer decisions are recorded below;
coding proceeds against this note.

Server-side versions checked on 2026-10-19 (to install at 3.1): `better-auth`
1.7.11, `drizzle-orm` 0.45.4, `postgres` 3.4.9.

## Reviewer decisions

1. **Token split approved.** Session token + short-lived JWT access token. Add an
   absolute session lifetime cap of **30 days** on top of the rolling 7-day expiry.
2. **App <-> API PKCE is required** (the first design was rejected). The app keeps a
   `code_verifier` in memory and sends `S256(verifier)` as `challenge` inside the
   callback URL. `/auth/desktop/callback` stores `{ott -> challenge}` with the OTT
   TTL. `/auth/desktop/exchange` requires `verifier`, compares `S256(verifier)` to
   the stored challenge in constant time, then consumes the OTT. Reason: a custom
   URL scheme can be claimed by another app and the OTT + state travel together.
3. **Two thin routes + `requireAuth` approved.** `requireAuth` verifies the access
   JWT through JWKS (issuer, audience, `exp`, 30s leeway) and is used by every
   protected route. The JWT plugin's `jwks` table is accepted.
4. **Storage approved.** Session token in the keychain; Google provider tokens stay
   server-side.
5. **Account linking:** never auto-link Google to an existing email/password user
   whose email is not verified. New Google-only users are allowed.
6. **`trustedOrigins`** is limited to the API origin. The callback route redirects
   only to the app's deep-link scheme, and `state` + `challenge` are validated
   (base64url, length bounds).
7. **CORS:** allow the exact Tauri webview origins per OS plus the dev origin.
8. **CSP:** production `connect-src` is config-driven and includes the real API URL.
9. **Deep-link scheme:** `tauri-saas-starter://` replaces `myapp://`, defined once in
   the app config so the M10 rename script can change it.

## Token model

| Credential                           | Format                                        | Lifetime                                                     | Minted by                                                    | Used for                                              | Stored in                                                   |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| Session token ("refresh" credential) | Opaque random token (`session.token`, DB row) | Rolling 7 days (`updateAge` 1 day), **absolute cap 30 days** | `sign-in/email`, OAuth exchange                              | Minting access tokens; sign-out/revocation            | Keychain, key `auth.sessionToken`                           |
| Access token                         | EdDSA JWT, verified via JWKS                  | 15 minutes (JWT plugin default)                              | `POST /api/auth/token`, authenticated with the session token | Every protected API request (`Authorization: Bearer`) | Keychain, key `auth.accessToken` (+ `auth.accessExpiresAt`) |
| User cache                           | `{id, email, name}` JSON                      | until sign-out                                               | session response                                             | Offline shell render only                             | Keychain, key `auth.user`                                   |

"Refresh" means: call `POST /api/auth/token` with the session token as a Bearer
credential, replace the access token. The session token is what Better Auth calls a
session; it is not a separate OAuth refresh token.

The 30-day absolute cap is enforced by clamping `expiresAt` to
`session.createdAt + 30 days` on session create and on every rolling update
(`databaseHooks.session.create/update`). After that, refresh returns 401 and the
device must sign in again.

## Storage rules

- Keychain service = app identifier (`com.example.tauri-saas-starter`).
- Tokens and the user cache go through `secureStorage` (M2.3) only. No
  `localStorage`, `sessionStorage`, or plugin-store entries.
- Pending OAuth `state`, `code_verifier` live in memory only (10 minute TTL). A
  restart mid-flow cancels the flow; the user retries.
- Access tokens are written to the keychain so a restart can show the signed-in
  shell immediately while the session is revalidated.

## Google OAuth sequence (system browser + deep link)

1. App generates `state` (32 random bytes) and `code_verifier` (43-128 base64url
   characters); computes `challenge = BASE64URL(SHA256(verifier))`; stores
   `{state, verifier}` in memory with a 10 minute expiry. It opens the system
   browser (opener plugin) at
   `{API_URL}/api/auth/sign-in/social?provider=google&callbackURL={API_URL}/auth/desktop/callback%3Fstate%3D{state}%26challenge%3D{challenge}`.
2. Better Auth validates the callback URL against its config, creates its own OAuth
   state + S256 PKCE challenge (stored server-side in `verification`), and redirects
   to Google.
3. Google authenticates and redirects to `{API_URL}/api/auth/callback/google`.
   Better Auth validates its state + PKCE, creates/links the user and session, sets
   the session cookie in the system browser, and redirects to the `callbackURL`.
4. `GET /auth/desktop/callback?state&challenge` (browser cookie present) validates
   both query values (base64url, length bounds), reads the session with
   `auth.api.getSession`, issues a one-time token (`3` minutes), stores
   `{ott -> challenge}` in the `verification` table keyed by `sha256(ott)` (3 minute
   TTL, single use), and responds `302` to
   `tauri-saas-starter://auth/callback?code={ott}&state={state}`.
5. The OS opens the app. The deep-link handler compares `state` to the pending value
   (constant time, single use). Mismatch or expiry: reject, no exchange.
6. App calls `POST {API_URL}/auth/desktop/exchange` with `{token: ott, verifier}`.
   The route looks up the challenge, compares `S256(verifier)` in constant time,
   consumes the OTT and challenge entry, calls `auth.api.verifyOneTimeToken`, and
   returns `{sessionToken, expiresAt, user}`.
7. App stores the session token and user, calls `POST /api/auth/token` to mint the
   access JWT, stores it, sets auth state to `authenticated`, and navigates to the
   `redirect` target.

PKCE/state on the Google leg are Better Auth's responsibility. The app-level PKCE
pair protects the app <-> API handoff. A wrong verifier, a replayed OTT, or an
expired entry is rejected before any session is issued.

## Logout and revocation

- **Sign out (this device):** `POST /api/auth/sign-out` with the session token, then
  delete the four keychain entries, clear the TanStack Query cache, run the
  `onSignOut` registry, set `unauthenticated`, navigate to `/sign-in`. Keychain
  deletion is attempted even when the network call fails.
- **Delete account:** Better Auth `deleteUser` (fresh session or password), same
  local cleanup.
- **Revoked elsewhere / expired / 30-day cap:** the next `/api/auth/token` returns
  401; the app clears credentials and signs out. No background polling.
- Sessions are DB rows; `revokeSessions` remains available for a future "sign out
  everywhere" action (out of scope for M3).

## Failure modes

| Failure                                          | Behaviour                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Keychain unavailable/locked                      | Stay unauthenticated, show a retryable error. Never fall back to plaintext storage.                             |
| Session expired, revoked, or past the 30-day cap | Refresh returns 401 -> clear keychain + caches -> `/sign-in`.                                                   |
| Network error during refresh                     | Do **not** sign out. Keep the session token and state, show an offline banner, retry on the next request.       |
| Deep link with wrong/expired/reused `state`      | Reject, discard the payload, offer retry.                                                                       |
| Wrong PKCE verifier                              | Exchange returns 400, the OTT/challenge entry is consumed, the flow must restart.                               |
| OTT expired or already used                      | Exchange returns 4xx -> discard, offer retry.                                                                   |
| User cancels in the browser                      | No callback; pending state expires after 10 minutes; UI offers retry.                                           |
| App launched by the deep link                    | Handle the URL before route guards resolve; queue exactly one pending URL until the auth store is ready.        |
| Concurrent 401s                                  | One shared in-flight refresh promise; other requests await it and retry once. Network failures do not sign out. |
| Clock skew                                       | JWT verification allows 30s leeway; a 401 always wins over local expiry math.                                   |
| Two sign-in attempts                             | A new attempt replaces the pending state; the older deep link is rejected.                                      |

## Account linking policy

Implicit Google linking to an existing local user is allowed **only** when that
user's email is verified. The auth config disables implicit linking and a
`databaseHooks.account.create.before` check rejects the link when the target user
has a `credential` account and `emailVerified = false`. New Google-only users are
created normally. A unit test covers the predicate (verified credential user ->
allow; unverified credential user -> reject; Google-only user -> allow).

## API surface and middleware

- Better Auth handler at `/api/auth/*` (email/password + Google).
- `GET /auth/desktop/callback` - browser-only, cookie session -> OTT -> deep link.
- `POST /auth/desktop/exchange` - app-only, PKCE check + OTT -> session token.
- `POST /api/auth/token` - JWT plugin, 15 minute access token.
- `requireAuth` middleware: fetches/caches JWKS from
  `{API_URL}/api/auth/jwks`, verifies iss/aud/exp with 30s leeway, sets the claims
  on the Hono context. Every non-auth protected route uses it (start with
  `GET /api/me`).
- Plugins: `bearer()`, `jwt()`, `oneTimeToken()`.
- Tables: Better Auth core (`user`, `session`, `account`, `verification`) plus
  `jwks`.
- Rate limiting: Better Auth built-in limiter with a stricter rule on
  `/sign-in/*`, `/sign-up/*`, `/one-time-token/*`.
- CORS allowlist: `tauri://localhost` (macOS/Linux production),
  `http://tauri.localhost` and `https://tauri.localhost` (Windows production),
  `http://localhost:1420` (dev). `Authorization` and `Content-Type` allowed.
- Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
no-referrer`, `Cross-Origin-Opener-Policy: same-origin`.
- Password min length 10, email verification behind
  `AUTH_REQUIRE_EMAIL_VERIFICATION`, mail sent through a logging `MailerPort`
  stub in dev.

## CSP (config-driven)

Production CSP is generated from the environment. A small `scripts/tauri.mjs`
wrapper reads `VITE_API_URL` and passes a merged config to the Tauri CLI with
`connect-src 'self' {API_ORIGIN}`; the static `tauri.conf.json` keeps only the dev
origins. This keeps the real API URL out of committed config while still allowing
it at build time.

## Deep links in development

- **macOS:** schemes only work for a bundled app installed in `/Applications`;
  runtime registration is not supported. Test with `pnpm --filter desktop tauri
build`, copy the `.app` to `/Applications`, then open
  `open tauri-saas-starter://auth/callback?code=test&state=test`. `tauri dev`
  cannot receive deep links.
- **Windows:** call `register_all()` in debug, then `start
tauri-saas-starter://...`. Without the single-instance plugin (M8) a deep link
  launches a second process.
- **Linux:** out of scope for v1; `register_all()` + `xdg-open` works the same way.

## Alternatives considered

- **Cookie sessions only:** the Tauri WebView and the system browser have separate
  cookie jars, so a browser-completed OAuth flow cannot hand its cookie to the app.
- **Session token as the only token:** simplest, but M3.9 requires a short-lived
  access token plus a single refresh retry.
- **DB-backed `{ott -> challenge}`:** stored in `verification` keyed by a hash of
  the OTT, so any API instance can finish the exchange and raw OTTs are not at rest.

## Required env (documented in `docs/auth-setup.md`)

`DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_DEEP_LINK_SCHEME`,
`AUTH_REQUIRE_EMAIL_VERIFICATION`, `PORT`, plus the desktop `VITE_API_URL`.
