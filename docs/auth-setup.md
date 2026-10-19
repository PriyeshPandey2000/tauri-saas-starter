# Auth setup (M3)

## 1. Postgres

Provide two connection strings:

- `DATABASE_URL` - pooled runtime URL (small pool, max 5 by default).
- `DATABASE_URL_DIRECT` - unpooled URL used by drizzle-kit migrations.

Any Postgres host works; the code contains no host-specific APIs. For local
development a plain `postgres://user:password@localhost:5432/app` is enough for both.

## 2. Local database (Docker)

```bash
pnpm db:up      # postgres:17 with a named volume on :5432
pnpm db:down    # stop, keep data
pnpm db:reset   # drop the volume and recreate
```

Defaults are `app` / `app` / `app` on `localhost:5432`:

```env
DATABASE_URL=postgres://app:app@localhost:5432/app
DATABASE_URL_DIRECT=postgres://app:app@localhost:5432/app
```

Start Docker Desktop (or OrbStack) first; `docker info` must succeed.

API tests do not need Docker: they run against PGlite with the same committed
migrations and the real Drizzle adapter.

### Hosted Postgres

Only `DATABASE_URL` (pooled) and `DATABASE_URL_DIRECT` (unpooled) change. Neon,
Supabase, RDS, and local Postgres are interchangeable; no host-specific code exists.

## 3. Environment

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:

| Variable                          | Required | Notes                                                                           |
| --------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `PORT`                            | no       | Defaults to `8787`.                                                             |
| `DATABASE_URL`                    | yes      | Pooled Postgres URL.                                                            |
| `DATABASE_URL_DIRECT`             | yes      | Unpooled URL for migrations.                                                    |
| `DATABASE_POOL_MAX`               | no       | Defaults to 5.                                                                  |
| `BETTER_AUTH_SECRET`              | yes      | 32+ characters (`openssl rand -base64 32`).                                     |
| `BETTER_AUTH_URL`                 | yes      | Public API base URL, e.g. `http://localhost:8787`. Used as JWT issuer/audience. |
| `GOOGLE_CLIENT_ID`                | yes      | From Google Cloud.                                                              |
| `GOOGLE_CLIENT_SECRET`            | yes      | From Google Cloud. Never commit.                                                |
| `APP_DEEP_LINK_SCHEME`            | no       | Defaults to `tauri-saas-starter`.                                               |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | no       | `true` or `false`.                                                              |
| `CORS_ORIGINS`                    | no       | Extra comma-separated origins; Tauri origins are built in.                      |

Desktop: `apps/desktop/.env.development` already sets
`VITE_API_URL=http://localhost:8787`. Production builds need `VITE_API_URL` set in
the build environment (it also feeds the generated CSP connect-src).

## 4. Google Cloud OAuth

1. Create or pick a project in <https://console.cloud.google.com>.
2. Configure the OAuth consent screen (External, testing mode is fine for dev).
3. Create credentials -> OAuth client ID -> **Web application**.
4. Authorized redirect URI: `${BETTER_AUTH_URL}/api/auth/callback/google`
   (for dev: `http://localhost:8787/api/auth/callback/google`).
5. Copy the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. Add your Google account as a test user while the consent screen is in testing.

No secret belongs in the repo; `apps/api/.env` is gitignored.

## 5. Migrations

```bash
pnpm --filter api db:generate   # after schema changes
pnpm --filter api db:migrate    # uses DATABASE_URL_DIRECT
```

The committed migration creates `user`, `session`, `account`, `verification`, and
`jwks`.

## 6. Run

```bash
pnpm --filter api dev
pnpm --filter desktop tauri dev
```

Email verification and password-reset links are sent through the logging
`MailerPort` stub, so they appear in the API console in dev.

## 7. Testing Google OAuth

- **macOS:** deep links only work for a bundled app installed under
  `/Applications`. Run `pnpm --filter desktop tauri build`, copy the `.app` there,
  then start the flow from the app. `tauri dev` cannot receive the callback.
  You can also sanity-check registration with
  `open tauri-saas-starter://auth/callback?code=test&state=test`.
- **Windows:** the config schemes are registered at runtime in debug builds; a deep
  link may launch a second instance until the single-instance plugin lands in M8.
- The app validates `state` and the PKCE verifier before exchanging the one-time
  token. A mismatch shows an error and the flow must be restarted.

## 8. Origins

The webviews and Better Auth must agree on where requests come from, so one helper
(`resolveTrustedOrigins`, `apps/api/src/auth/origins.ts`) feeds both Hono CORS and
Better Auth `trustedOrigins`. The built-in list is `tauri://localhost`,
`http://tauri.localhost`, `https://tauri.localhost`, plus `http://localhost:1420`
outside production, plus any `CORS_ORIGINS` extras. `BETTER_AUTH_URL` stays in
`trustedOrigins`. The origin check is pinned on (`advanced.disableOriginCheck:
false`) because Better Auth otherwise skips it when `NODE_ENV=test`.

## 9. Rate limiting

Better Auth's built-in limiter (sign-in/sign-up/OTT rules) uses per-instance memory
storage, and the desktop OAuth routes `/auth/desktop/*` use the same model (30
requests per minute per client). Running more than one API instance requires moving
both to shared storage (`rateLimit.storage: "database"` plus a `rateLimit` table, or
Redis).

The desktop limiter keys each bucket on the socket address by default. It ignores
`x-forwarded-for`, since a client can set that header freely. Behind a proxy, set
`TRUSTED_PROXY_HEADER` to the header the proxy appends (for example `fly-client-ip`
on Fly.io) so the real client IP is used instead. Better Auth also reads
`advanced.ipAddress.ipAddressHeaders` from this value to key its built-in rate
limits; if no IP can be determined, Better Auth falls back to a single shared
per-path bucket.

## 10. Manual checks

- Sign up, verify (check the API console link if verification is enabled), sign in.
- Google round-trip through the browser and deep link.
- Quit and relaunch: the session restores from the keychain.
- Sign out: keychain entries are gone and protected routes redirect.
