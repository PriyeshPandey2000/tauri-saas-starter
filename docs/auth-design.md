# Auth design (M3)

Status: **awaiting reviewer approval (task 3.0).** No auth code is written until this
note is approved.

Server-side versions checked on 2026-10-19 (to install at 3.1): `better-auth`
1.7.11, `drizzle-orm` 0.45.4, `postgres` 3.4.9.

## Decisions in one paragraph

Better Auth runs in `apps/api` with the Drizzle/Postgres adapter. The desktop app
never uses cookies. Sign-in produces an opaque Better Auth **session token** (the
long-lived credential) and a short-lived **JWT access token** minted from it. Both
live only in the OS keychain. Google OAuth happens in the system browser, with
Better Auth owning the Google leg's state and S256 PKCE. The API callback converts
the browser session into a Better Auth one-time token (OTT); the app receives it on
a deep link, verifies its own `state`, and exchanges the OTT for the session token.

## Token model

| Credential                           | Format                                        | Lifetime                            | Minted by                                                    | Used for                                        | Stored in                                                   |
| ------------------------------------ | --------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| Session token ("refresh" credential) | Opaque random token (`session.token`, DB row) | 7 days, rolling (`updateAge` 1 day) | `sign-in/email`, OAuth exchange                              | Minting access tokens; sign-out/revocation      | Keychain, key `auth.sessionToken`                           |
| Access token                         | EdDSA JWT, verified via JWKS                  | 15 minutes (JWT plugin default)     | `POST /api/auth/token`, authenticated with the session token | Every app API request (`Authorization: Bearer`) | Keychain, key `auth.accessToken` (+ `auth.accessExpiresAt`) |
| User cache                           | `{id, email, name}` JSON                      | until sign-out                      | session response                                             | Offline shell render only                       | Keychain, key `auth.user`                                   |

"Refresh" means: call `POST /api/auth/token` with the session token as a Bearer
credential, replace the access token. The session token is what Better Auth calls a
session; it is not a separate OAuth refresh token. Google provider tokens stay
server-side in the `account` table and are never sent to the app.

There is no refresh token rotation: the session row is rolled forward by Better Auth
when it is used (`updateAge`). Revoking the session is the only invalidation.

## Storage rules

- Keychain service = app identifier (`com.example.tauri-saas-starter`).
- Tokens and the user cache go through `secureStorage` (M2.3) only. No
  `localStorage`, `sessionStorage`, or plugin-store entries.
- Pending OAuth `state` lives in memory only (10 minute TTL). A restart mid-flow
  cancels the flow; the user retries.
- Access tokens are written to the keychain so a restart can show the signed-in
  shell immediately while the session is revalidated.

## Google OAuth sequence (system browser + deep link)

1. App generates `state` (32 random bytes, base64url), stores it in memory with a
   10 minute expiry, and opens the system browser (opener plugin) at
   `{API_URL}/api/auth/sign-in/social?provider=google&callbackURL={API_URL}/auth/desktop/callback?state={state}`.
2. Better Auth creates its OAuth state + S256 PKCE challenge (stored server-side in
   `verification`), and redirects the browser to Google.
3. Google authenticates the user and redirects to
   `{API_URL}/api/auth/callback/google`. Better Auth validates its state and PKCE,
   creates/links the user and session, sets the session cookie in the system
   browser, and redirects to the `callbackURL`.
4. `GET /auth/desktop/callback` (API, browser cookie present) reads the session with
   `auth.api.getSession`, calls `auth.api.generateOneTimeToken` (3 minute, single
   use), and responds `302` to
   `myapp://auth/callback?code={ott}&state={state}`.
5. macOS/Windows opens the app with that URL. The deep-link handler compares
   `state` to the pending value (constant-time, single use). Mismatch or expiry:
   reject and show an error, no exchange.
6. App calls `POST {API_URL}/auth/desktop/exchange` with `{token: ott}`. The thin
   route calls `auth.api.verifyOneTimeToken` and returns
   `{sessionToken, expiresAt, user}`. (Returning the token explicitly avoids
   relying on cookie behaviour in the WebView.)
7. App stores `auth.sessionToken` and `auth.user`, calls `POST /api/auth/token`
   with the session token to mint the access JWT, stores it, sets the auth store to
   `authenticated`, and navigates to the `redirect` target.

PKCE/state on the Google leg are Better Auth's responsibility. The app-level
`state` only binds the deep link to the flow the app started. We do **not** add a
second PKCE handshake between app and API (decision requested below).

## Logout and revocation

- **Sign out (this device):** `POST /api/auth/sign-out` with the session token,
  then delete `auth.sessionToken`, `auth.accessToken`, `auth.accessExpiresAt`,
  `auth.user`; clear the TanStack Query cache; run the `onSignOut` registry so
  features can drop per-user state; set auth state to `unauthenticated`; navigate
  to `/sign-in`. Keychain deletion is attempted even when the network call fails.
- **Delete account:** Better Auth `deleteUser` (fresh session or password), same
  local cleanup.
- **Revoked elsewhere / expired:** the next `/api/auth/token` call returns 401; the
  app clears credentials and signs out. There is no background polling.
- Sessions are DB rows; Better Auth `revokeSessions` is available for a future
  "sign out everywhere" action (out of scope for M3).

## Failure modes

| Failure                                     | Behaviour                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Keychain unavailable/locked                 | Stay unauthenticated, show a retryable error. Never fall back to plaintext storage.                                          |
| Session expired or revoked                  | Refresh returns 401 -> clear keychain + caches -> `/sign-in`.                                                                |
| Network error during refresh                | Do **not** sign out. Keep the session token, keep the last auth state, surface an offline banner, retry on the next request. |
| Deep link with wrong/expired/reused `state` | Reject, discard the payload, show "sign-in could not be completed", offer retry.                                             |
| OTT expired or already used                 | Exchange returns 4xx -> discard, offer retry. OTT TTL is 3 minutes.                                                          |
| User cancels in the browser                 | No callback; pending state expires after 10 minutes; UI offers retry.                                                        |
| App launched by the deep link               | Handle the URL before router guards resolve; if the auth store is not ready, queue exactly one pending URL.                  |
| Concurrent 401s                             | One shared in-flight refresh promise; other requests await it and retry once. Network failures do not sign out.              |
| Clock skew                                  | JWT verification allows 30s leeway; a 401 always wins over local expiry math.                                                |
| Two sign-in attempts                        | A new attempt replaces the pending state; the older deep link is rejected.                                                   |

## Server surface added in M3

- Better Auth handler at `/api/auth/*` (email/password + Google).
- `GET /auth/desktop/callback` - browser-only, reads the cookie session and issues
  the OTT deep-link redirect.
- `POST /auth/desktop/exchange` - app-only, verifies the OTT and returns the session
  token explicitly.
- Plugins: `bearer()` (session token as Bearer), `jwt()` (15 minute access JWT,
  adds a `jwks` table), `oneTimeToken()` (3 minute single-use OTT).
- Tables: Better Auth core (`user`, `session`, `account`, `verification`) plus
  `jwks`.
- Rate limiting on auth routes, CORS allowlist (`tauri://localhost` in packaged
  builds, `http://localhost:1420` in dev), secure headers, password min length 10,
  email-verification flag with a logging `MailerPort` stub.

## Alternatives considered

- **Cookie sessions only (Better Auth default):** the Tauri WebView and the system
  browser have separate cookie jars, so a browser-completed OAuth flow cannot hand
  its cookie to the app.
- **Session token as the only token:** simplest, but M3.9 requires a short-lived
  access token plus a single refresh retry. The JWT plugin supplies exactly that.
- **Second PKCE layer app <-> API:** would require a server-side `{state,
challenge}` store with TTL, plus start/exchange routes. It adds little over
  state + single-use OTT unless deep links are assumed hostile. Requested as an
  open decision.

## Decisions requested before coding

1. Approve the token split: session token (keychain) + 15 minute JWT access token
   (keychain), with `/api/auth/token` as the refresh call.
2. Approve using Better Auth's Google-leg PKCE/state and app-level `state` + OTT,
   **without** a second app <-> API PKCE handshake.
3. Approve the two thin API routes (`/auth/desktop/callback`,
   `/auth/desktop/exchange`) and the `jwks` table that the JWT plugin adds.
4. Confirm the session token may be written to the keychain and that the Google
   provider tokens stay server-side only.
