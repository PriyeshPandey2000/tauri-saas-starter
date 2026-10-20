# Decisions Log (append-only)

Agent: record any deviation from PRD.md here with date, what, why. Do not edit past entries.

## Dependency versions (agent maintains; one row per dependency)

| Package / crate                    | Version installed | Date       | Notes                                                                          |
| ---------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------ |
| @commitlint/cli                    | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @commitlint/config-conventional    | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @eslint/js                         | 10.0.1            | 2026-10-19 | latest stable                                                                  |
| @hookform/resolvers                | 6.0.0             | 2026-10-19 | latest stable; zod resolver for RHF                                            |
| @electric-sql/pglite               | 0.5.10            | 2026-10-19 | latest stable; in-memory Postgres for API tests                                |
| @hono/node-server                  | 2.1.5             | 2026-10-19 | latest stable; API server, preserves multiple Set-Cookie headers               |
| @radix-ui/react-slot               | 1.5.0             | 2026-10-19 | latest stable                                                                  |
| @tanstack/react-query              | 5.104.4           | 2026-10-19 | latest stable                                                                  |
| @tanstack/react-router             | 1.170.45          | 2026-10-19 | latest stable                                                                  |
| @sentry/react                      | 11.8.0            | 2026-10-20 | latest stable; JS crash reporting (adapter only)                               |
| @tanstack/react-virtual            | 3.14.21           | 2026-10-20 | latest stable; notes list virtualization                                       |
| @tanstack/router-cli               | 1.167.45          | 2026-10-19 | latest stable; `tsr generate` route tree                                       |
| @tanstack/router-plugin            | 1.168.47          | 2026-10-19 | latest stable; Vite file-based route generation                                |
| @tailwindcss/vite                  | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| @testing-library/react             | 16.3.3            | 2026-10-19 | latest stable; renders the settings page in tests                              |
| @testing-library/dom               | 10.4.2            | 2026-10-19 | latest stable; peer of @testing-library/react                                  |
| @tauri-apps/api                    | 2.12.4            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/cli                    | 2.12.3            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/plugin-deep-link       | 2.6.2             | 2026-10-19 | latest stable; OAuth callback deep links                                       |
| @tauri-apps/plugin-log             | 2.10.1            | 2026-10-19 | latest stable; file logger adapter                                             |
| @tauri-apps/plugin-opener          | 2.7.2             | 2026-10-19 | latest stable; opens the system browser                                        |
| @tauri-apps/plugin-autostart       | 2.7.0             | 2026-10-20 | latest stable; launch at login                                                 |
| @tauri-apps/plugin-global-shortcut | 2.4.1             | 2026-10-20 | latest stable; settings-registered shortcut                                    |
| @tauri-apps/plugin-notification    | 2.7.0             | 2026-10-20 | latest stable; permission flow                                                 |
| @tauri-apps/plugin-process         | 2.4.0             | 2026-10-20 | latest stable; relaunch after update                                           |
| @tauri-apps/plugin-sql             | 2.6.0             | 2026-10-20 | latest stable; local SQLite (npm client for tauri-plugin-sql)                  |
| @tauri-apps/plugin-updater         | 2.14.0            | 2026-10-20 | latest stable; signed auto-updates                                             |
| @tauri-apps/plugin-store           | 2.5.0             | 2026-10-19 | latest stable; settings persistence                                            |
| @tauri-apps/plugin-window-state    | 2.5.0             | 2026-10-19 | latest stable; window size/position                                            |
| @types/node                        | 26.6.5            | 2026-10-19 | latest stable                                                                  |
| @types/react                       | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @types/react-dom                   | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/eslint-plugin   | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/parser          | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @vitejs/plugin-react               | 6.1.2             | 2026-10-19 | latest stable                                                                  |
| better-auth                        | 1.7.11            | 2026-10-19 | latest stable; auth server (approved design)                                   |
| class-variance-authority           | 0.7.1             | 2026-10-19 | latest stable                                                                  |
| clsx                               | 2.1.1             | 2026-10-19 | latest stable                                                                  |
| cmdk                               | 1.1.1             | 2026-10-19 | latest stable; command palette                                                 |
| drizzle-kit                        | 0.31.11           | 2026-10-19 | latest stable; migrations via DATABASE_URL_DIRECT                              |
| drizzle-orm                        | 0.45.4            | 2026-10-19 | latest stable; Postgres access                                                 |
| eslint                             | 10.13.0           | 2026-10-19 | latest stable                                                                  |
| eslint-import-resolver-alias       | 1.1.2             | 2026-10-19 | resolves `@/*` for eslint-plugin-boundaries (see Deviations)                   |
| eslint-plugin-boundaries           | 7.2.0             | 2026-10-19 | latest stable                                                                  |
| eslint-plugin-import               | 2.32.0            | 2026-10-19 | resolver infrastructure for boundaries; peer warns on eslint 10                |
| eslint-plugin-react-hooks          | 7.1.1             | 2026-10-19 | latest stable                                                                  |
| hono                               | 4.13.13           | 2026-10-19 | latest stable                                                                  |
| husky                              | 9.1.7             | 2026-10-19 | latest stable                                                                  |
| i18next                            | 26.5.2            | 2026-10-19 | latest stable                                                                  |
| jose                               | 6.2.12            | 2026-10-19 | latest stable; JWT/JWKS verification                                           |
| jsdom                              | 30.1.3            | 2026-10-19 | latest stable                                                                  |
| keyring                            | 4.2.0             | 2026-10-19 | latest stable; OS keychain for secure storage                                  |
| lint-staged                        | 17.6.0            | 2026-10-19 | latest stable                                                                  |
| lucide-react                       | 1.59.0            | 2026-10-19 | latest stable                                                                  |
| postgres                           | 3.4.9             | 2026-10-19 | latest stable; Postgres driver (max 5 by default)                              |
| prettier                           | 3.9.10            | 2026-10-19 | latest stable                                                                  |
| react                              | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-dom                          | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-hook-form                    | 7.90.0            | 2026-10-19 | latest stable                                                                  |
| react-i18next                      | 17.1.0            | 2026-10-19 | latest stable                                                                  |
| sonner                             | 2.0.8             | 2026-10-19 | latest stable; toasts                                                          |
| specta                             | 2.0.0-rc.25       | 2026-10-19 | pre-release, exact pin (`=`) approved for Tauri 2 (see Deviations)             |
| specta-typescript                  | 0.0.12            | 2026-10-19 | latest stable; used by the pre-release IPC stack (see Deviations)              |
| tailwind-merge                     | 3.7.0             | 2026-10-19 | latest stable                                                                  |
| standardwebhooks                   | 1.1.1             | 2026-10-20 | latest stable; Dodo webhook signature verification (API only)                  |
| tauri-plugin-autostart             | 2.7.0             | 2026-10-20 | latest stable; launch at login (off by default)                                |
| tauri-plugin-global-shortcut       | 2.4.1             | 2026-10-20 | latest stable; user-configurable show/hide shortcut                            |
| tauri-plugin-notification          | 2.7.0             | 2026-10-20 | latest stable; permission-gated desktop notifications                          |
| tauri-plugin-process               | 2.4.0             | 2026-10-20 | latest stable; relaunch after an update                                        |
| tauri-plugin-single-instance       | 2.5.4             | 2026-10-20 | latest stable; focus existing window and forward deep links                    |
| tauri-plugin-updater               | 2.14.0            | 2026-10-20 | latest stable; signed auto-updates                                             |
| tailwindcss                        | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| tauri-plugin-deep-link             | 2.6.2             | 2026-10-19 | latest stable; scheme registration                                             |
| tauri-plugin-log                   | 2.10.1            | 2026-10-19 | latest stable; rotating log file (5 x 2MB)                                     |
| tauri-plugin-opener                | 2.7.2             | 2026-10-19 | latest stable; system browser                                                  |
| tauri-plugin-sql                   | 2.6.0             | 2026-10-20 | latest stable; local SQLite (crate; `sqlite` feature)                          |
| tauri-plugin-store                 | 2.5.0             | 2026-10-19 | latest stable (rustc 1.99.1); settings file in app data dir                    |
| tauri-plugin-window-state          | 2.5.0             | 2026-10-19 | latest stable (rustc 1.99.1); window size/position                             |
| tauri-specta                       | 2.0.0-rc.25       | 2026-10-19 | pre-release, exact pin (`=`) approved for Tauri 2 (see Deviations)             |
| thiserror                          | 2.0.21            | 2026-10-19 | latest stable; AppError                                                        |
| tsx                                | 4.23.15           | 2026-10-19 | latest stable                                                                  |
| turbo                              | 2.11.9            | 2026-10-19 | latest stable                                                                  |
| typescript                         | 6.0.3             | 2026-10-19 | pinned below <6.1.0 for typescript-eslint@8.71.2 peer range (TS 7 unsupported) |
| typescript-eslint                  | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| vite                               | 8.3.4             | 2026-10-19 | latest stable                                                                  |
| vitest                             | 5.0.5             | 2026-10-19 | latest stable                                                                  |
| zod                                | 4.6.7             | 2026-10-19 | latest stable; packages/shared schemas + desktop env config                    |
| zustand                            | 5.0.15            | 2026-10-19 | latest stable                                                                  |

## Deviations

- **Removed `react-hook-form` and `@hookform/resolvers` (M1.11)**: the settings page now binds inputs straight to the zustand store, so both packages left `apps/desktop`. Reason: rule 16 (earn shared code) and bundle size; the rows above stay for history.
- **Pre-release IPC stack (M2.2, approved in writing)**: pinned `tauri-specta =2.0.0-rc.25`, `specta =2.0.0-rc.25`, and `specta-typescript =0.0.12`. Reason: no stable release supports Tauri 2 (`tauri-specta` 1.0.2 and `specta` 1.0.5 target Tauri 1/Specta v1). `specta-typescript` is stable, but is listed here because it is part of the same pre-release-bound stack. Revisit: when `tauri-specta` 2.0.0 stable ships, move all three to it and remove this exception.
- **API transport: plain `fetch` (M2.7)**: `shared/lib/apiClient.ts` uses the WebView `fetch`, not `tauri-plugin-http`. Reason: no API calls exist yet and `fetch` needs no extra permission or dependency. The CSP `connect-src` must list the API origin. Revisit in M4 if the API does not send CORS headers for the `tauri://localhost` origin; then switch to the HTTP plugin and document the capability.

- **TypeScript version pin**: pinned TypeScript to `~6.0.3` (6.0.3) in root and all workspaces instead of `^7.0.2`. Reason: `typescript-eslint@8.71.2` peer range is `typescript >=4.8.4 <6.1.0` and does not support TS 7.0 yet. Revisit: when typescript-eslint ships stable support for TypeScript 7.
- **Module resolution for boundaries**: use `eslint-import-resolver-alias` (map `@` -> `apps/desktop/src`, `@app/shared` -> `packages/shared/src`) instead of `eslint-import-resolver-typescript`. Reason: `eslint-import-resolver-typescript@4.4.5` fails to resolve `@/*` path mappings when the tsconfig uses a relative `baseUrl` under TypeScript 6 (returns `found: false`), which would make `eslint-plugin-boundaries` classify local imports as external and silently skip the rule 15 checks. Revisit: when the TypeScript resolver supports TS 6 relative `baseUrl`.
- **Rust toolchain bump (M1)**: updated the local `stable` toolchain from rustc 1.89.0 to 1.99.1. Reason: the latest `tauri-plugin-store` 2.5.0 and `tauri-plugin-window-state` 2.5.0 crates require rustc >= 1.90 (rule 14: install latest stable deps). `rust-toolchain.toml` still pins `channel = "stable"`, so CI resolves the same latest stable. Alternative was pinning older crates; rejected to stay on latest stable.
- **Shared package excluded from boundaries classification**: added `**/packages/shared/**` to `boundaries/ignore`. Reason: `@app/shared` resolves outside `apps/desktop/src`, so the plugin classified it as an `entry` element and rejected `feature -> @app/shared` imports. Shared is importable by every layer anyway, so ignoring it preserves the rule 15 intent.
- **Capability file converted to TOML (M1 title bar)**: renamed `apps/desktop/src-tauri/capabilities/default.json` to `default.toml` so the new `core:window:allow-set-theme` grant can carry an inline comment. Reason: Tauri's capability loader supports `toml` unconditionally (`tauri-utils` ACL reader), while JSON has no comments and JSON5 support is behind the `config-json5` feature flag. `cargo check` and `tauri dev` parse the file; the directory scan glob is `{}/**/*`.

- **Vendor import check knows the API auth folder (M3.1/M3.2)**: `scripts/check-vendor-imports.mjs` also allows `apps/api/src/auth/`, because that folder is the API's Better Auth adapter/composition (the desktop-oriented boundary rules and `src/ports/adapters` layout do not apply to the Hono server). The desktop app still imports `better-auth` nowhere.
- **CSP is generated at build/dev time (M3.2)**: `apps/desktop/scripts/tauri.mjs` reads `VITE_API_URL` and passes a merged `--config` so `connect-src` includes the real API origin; the committed `tauri.conf.json` CSP is only a fallback for direct CLI use.

- **Boundary check ignores the auth contract test (M3.12)**: `apps/api/src/__tests__/contract.test.ts` imports the real desktop adapter on purpose, which crosses the desktop-oriented element rules. It is test-only and excluded from the API tsconfig build; production code keeps the boundaries.

- **Rate limiting is per API instance (M3.2)**: Better Auth's limiter uses memory storage; `storage: "database"` would add a `rateLimit` table and is deferred until the API scales beyond one instance. The desktop routes use a small in-memory limiter for the same reason.
- **Desktop PKCE challenges live in `verification` (M3 review item 7)**: rows are keyed by `desktop-pkce:<sha256(ott)>` and deleted on use; they expire with the OTT (3 minutes).

- **SQL port is `DatabasePort`, not `StoragePort` (M4.4, answers M4 Q1)**: `ports/StoragePort` is already the key/value port used by settings, so M4 adds `ports/DatabasePort.ts` (`query`, `execute`, `transaction`) with a `SqliteDatabase` adapter and leaves the KV port untouched. Reason: one interface, one responsibility.
- **Local migrations run from TypeScript (M4.3)**: numbered SQL stays in `src-tauri/migrations/*.sql`, but the app applies it through `@tauri-apps/plugin-sql` (`ports/adapters/sqlite/migrations.ts`), each file in one transaction and tracked in `_migrations`. Reason: `tauri-plugin-sql`'s Rust `Migrations` registry binds to a single fixed URL, while notes need a per-user file (`app-<userId>.db`); the JS `Database` API is the plugin's own client, so no second SQLite stack is added. The files are bundled with Vite `?raw`.
- **`DatabasePort.transaction` serializes through an in-process mutex (M4.4)**: `@tauri-apps/plugin-sql` exposes no transaction API and pools connections, so `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK` run inside a per-database queue. Reason: SQLite is a single writer; the queue prevents interleaving the BEGIN/COMMIT window across concurrent calls.
- **Local notes repository lives in `shared/lib` (M4.5)**: `createLocalNotesRepository` takes a structural `Queryable` (`query`/`execute`) instead of importing `DatabasePort`. Reason: `shared -> port` is disallowed by the boundaries policy, and keeping the repository in `shared` lets the adapter test exercise it on real SQLite without a `feature -> adapter` violation.
- **`tauri-plugin-sql` 2.x, not 3.0.0-alpha (M4.1)**: `cargo search` lists `3.0.0-alpha.3` (Tauri 3 alpha line); M4 uses the stable Tauri 2 line, `2.6.0`. Reason: rule 14 is latest _stable_. Logged here in case the alpha line looks newer.
- **Query cache is persisted through `plugin-store`, and the notes feature owns the DB gate (M4.8)**: the cache lives in `query-cache.json` via a `QueryCachePort` adapter, auth-sensitive keys (`auth`, `me`, `session`, `token`) are excluded, and it is cleared on sign-out. Reason: `plugin-store` was already a dependency (rule 16). The `DatabaseGate` sits in `features/notes` because `routes -> app` is disallowed; auth opens the database, and sign-out closes it through the existing registry.
- **Query persistence uses an allowlist and hashed DB file names (M4 review)**: only `flags`/`preferences` queries reach disk (notes stay in per-user SQLite), user-data keys are scoped by user id, and the database file is `app-<sha256(userId)>.db` so `a.b` and `a_b` cannot collide. Reason: the original denylist plus sanitised names leaked one user's cached notes to the next session.
- **Notes feature owns its repositories (M4 review)**: `repository-core.ts` and `local-notes-repository.ts` moved from `shared/lib` to `features/notes`; `package.json`-style feature deletion must not leave notes code in `shared`.
- **Boundaries policy ignores the notes isolation test (M4.10)**: `apps/api/src/notes/__tests__/isolation.test.ts` imports the real desktop auth adapter, mirroring `contract.test.ts`. It is test-only and excluded from the API tsconfig build; production code keeps the boundaries.

- **PostHog flags use the REST `/flags` endpoint, not `posthog-js` (M5.3)**: `posthog-js@1.438.12` is ~27 MB unpacked and ships capture, autocapture, replay and survey machinery the desktop app does not need yet. The adapter calls `POST {host}/flags?v=2` with `api_key` + `distinct_id` and parses `flags` with Zod. Exposures use `POST /i/v0/e/`. No new dependency was added. Revisit when M7 adds product analytics: then the SDK choice (probably `posthog-js` or server-side capture) is made with the real bundle budget.
- **Flag overrides live in `settings.json` through the adapter (M5.4)**: the values are validated against the registry and stored under the `flagOverrides` key, but the adapter owns the read/write. Reason: `ports/adapters/*` may not import the settings feature, and `ports/index.ts` (composition root) may not import features. The dev panel talks to `FeatureFlagPort.setOverride`, and `VITE_APP_ENV=prod` disables it.
- **Flag cache is per identity in one file (M5.5)**: `flags.json` is keyed by `user:<id>` or `anon:<installId>`; reset deletes the signed-out user's entry. The query cache allowlist no longer contains `flags`, so flag values never reach the query-cache file.

- **Billing uses the Dodo REST API, not the SDK (M6)**: the API calls `/checkouts`, `/customers/{id}/customer-portal/session`, and verifies webhooks with `standardwebhooks@1.1.1`. No `dodopayments` SDK was added; the REST surface is small and keeps the vendor call sites in one adapter. Test mode is the default and live mode fails closed.
- **Entitlement snapshots use ECDSA P-256 with IEEE P1363 signatures (M6.8)**: Node signs with `dsaEncoding: "ieee-p1363"` so WebCrypto verifies the raw signature. The canonical payload has a fixed field order; `kid` selects among embedded public keys (`VITE_ENTITLEMENT_PUBLIC_KEYS`). Cache reads enforce a clock-rollback guard.
- **Checkout returns through an API bounce page (M6.6)**: `return_url` is `${API_PUBLIC_URL}/billing/return`, which redirects to a parameterless `tauri-saas-starter://billing/success`. Provider query parameters are never forwarded; the deep link only triggers a refetch.

- **Analytics is PostHog REST, not `posthog-js` (M7.3)**: same decision as flags. Only explicit typed events are sent; autocapture is not part of the transport. Revisit in M9 if a richer SDK is justified by the bundle budget.
- **Sentry is initialized lazily on consent (M7.4)**: the JS adapter calls `Sentry.init` only after `telemetryConsent === "granted"` and `Sentry.close()` on revoke; the Rust client starts with `auto_session_tracking(false)` and a `before_send` gate. This guarantees no events or sessions before consent.
- **Rust source maps/symbols and CI uploads are deferred to M9 (M7.1)**: `docs/observability.md` documents the CI steps and secret names; nothing is uploaded from the agent's machine.

- **Updater endpoint and public key are merged at build time (M8.8)**: `scripts/tauri.mjs` injects `plugins.updater` from `VITE_UPDATER_ENDPOINT` and `TAURI_UPDATER_PUBLIC_KEY`, so release builds must go through it. The private key (`TAURI_SIGNING_PRIVATE_KEY`) stays in CI only and is covered by the commit guard.
- **Tray/menu labels live in Rust (M8.3/M8.5)**: native menus cannot import the JS i18n bundle; `native.rs` centralizes English labels and reads the stored language. Add languages there alongside the JS bundles when more ship.
- **Updater signing feed is user-gated (M8.8)**: no private key or real feed was created here. The flow is unit-tested with injected checks and documented in `docs/manual-tests.md`; a real N→N+1 run needs the user's feed and signing key.

## Backlog (ideas out of current scope)

- Two-way sync + conflict resolution
- Encryption at rest for local DB
- Teams / roles / seats
- MFA, magic links
- Usage-based billing
- Linux support
- Session replay, perf tracing
- Store distribution (MSIX / Mac App Store)
- Move dev-only CSP origins (`http://localhost:1420`, `ws://localhost:1420`) out of the production CSP in `tauri.conf.json` into a dev-only override (scheduled M2/M9)
- Lazy-load the command palette (`cmdk`) and re-check the bundle with a visualizer. The main chunk is 176.95 kB gzip, already ~59% of the 300 kB initial-JS budget with no features, and the palette ships in it (scheduled M2/M9)
