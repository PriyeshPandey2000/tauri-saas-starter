# Decisions Log (append-only)

Agent: record any deviation from PRD.md here with date, what, why. Do not edit past entries.

## Dependency versions (agent maintains; one row per dependency)

| Package / crate                  | Version installed | Date       | Notes                                                                          |
| -------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------ |
| @commitlint/cli                  | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @commitlint/config-conventional  | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @eslint/js                       | 10.0.1            | 2026-10-19 | latest stable                                                                  |
| @hookform/resolvers              | 6.0.0             | 2026-10-19 | latest stable; zod resolver for RHF                                            |
| @electric-sql/pglite             | 0.5.10            | 2026-10-19 | latest stable; in-memory Postgres for API tests                                |
| @hono/node-server                | 2.1.5             | 2026-10-19 | latest stable; API server, preserves multiple Set-Cookie headers               |
| @radix-ui/react-slot             | 1.5.0             | 2026-10-19 | latest stable                                                                  |
| @tanstack/react-query            | 5.104.4           | 2026-10-19 | latest stable                                                                  |
| @tanstack/react-router           | 1.170.45          | 2026-10-19 | latest stable                                                                  |
| @tanstack/router-cli             | 1.167.45          | 2026-10-19 | latest stable; `tsr generate` route tree                                       |
| @tanstack/router-plugin          | 1.168.47          | 2026-10-19 | latest stable; Vite file-based route generation                                |
| @tailwindcss/vite                | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| @testing-library/react           | 16.3.3            | 2026-10-19 | latest stable; renders the settings page in tests                              |
| @testing-library/dom             | 10.4.2            | 2026-10-19 | latest stable; peer of @testing-library/react                                  |
| @tauri-apps/api                  | 2.12.4            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/cli                  | 2.12.3            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/plugin-deep-link     | 2.6.2             | 2026-10-19 | latest stable; OAuth callback deep links                                       |
| @tauri-apps/plugin-log           | 2.10.1            | 2026-10-19 | latest stable; file logger adapter                                             |
| @tauri-apps/plugin-opener        | 2.7.2             | 2026-10-19 | latest stable; opens the system browser                                        |
| @tauri-apps/plugin-store         | 2.5.0             | 2026-10-19 | latest stable; settings persistence                                            |
| @tauri-apps/plugin-window-state  | 2.5.0             | 2026-10-19 | latest stable; window size/position                                            |
| @types/node                      | 26.6.5            | 2026-10-19 | latest stable                                                                  |
| @types/react                     | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @types/react-dom                 | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/eslint-plugin | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/parser        | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @vitejs/plugin-react             | 6.1.2             | 2026-10-19 | latest stable                                                                  |
| better-auth                      | 1.7.11            | 2026-10-19 | latest stable; auth server (approved design)                                   |
| class-variance-authority         | 0.7.1             | 2026-10-19 | latest stable                                                                  |
| clsx                             | 2.1.1             | 2026-10-19 | latest stable                                                                  |
| cmdk                             | 1.1.1             | 2026-10-19 | latest stable; command palette                                                 |
| drizzle-kit                      | 0.31.11           | 2026-10-19 | latest stable; migrations via DATABASE_URL_DIRECT                              |
| drizzle-orm                      | 0.45.4            | 2026-10-19 | latest stable; Postgres access                                                 |
| eslint                           | 10.13.0           | 2026-10-19 | latest stable                                                                  |
| eslint-import-resolver-alias     | 1.1.2             | 2026-10-19 | resolves `@/*` for eslint-plugin-boundaries (see Deviations)                   |
| eslint-plugin-boundaries         | 7.2.0             | 2026-10-19 | latest stable                                                                  |
| eslint-plugin-import             | 2.32.0            | 2026-10-19 | resolver infrastructure for boundaries; peer warns on eslint 10                |
| eslint-plugin-react-hooks        | 7.1.1             | 2026-10-19 | latest stable                                                                  |
| hono                             | 4.13.13           | 2026-10-19 | latest stable                                                                  |
| husky                            | 9.1.7             | 2026-10-19 | latest stable                                                                  |
| i18next                          | 26.5.2            | 2026-10-19 | latest stable                                                                  |
| jose                             | 6.2.12            | 2026-10-19 | latest stable; JWT/JWKS verification                                           |
| jsdom                            | 30.1.3            | 2026-10-19 | latest stable                                                                  |
| keyring                          | 4.2.0             | 2026-10-19 | latest stable; OS keychain for secure storage                                  |
| lint-staged                      | 17.6.0            | 2026-10-19 | latest stable                                                                  |
| lucide-react                     | 1.59.0            | 2026-10-19 | latest stable                                                                  |
| postgres                         | 3.4.9             | 2026-10-19 | latest stable; Postgres driver (max 5 by default)                              |
| prettier                         | 3.9.10            | 2026-10-19 | latest stable                                                                  |
| react                            | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-dom                        | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-hook-form                  | 7.90.0            | 2026-10-19 | latest stable                                                                  |
| react-i18next                    | 17.1.0            | 2026-10-19 | latest stable                                                                  |
| sonner                           | 2.0.8             | 2026-10-19 | latest stable; toasts                                                          |
| specta                           | 2.0.0-rc.25       | 2026-10-19 | pre-release, exact pin (`=`) approved for Tauri 2 (see Deviations)             |
| specta-typescript                | 0.0.12            | 2026-10-19 | latest stable; used by the pre-release IPC stack (see Deviations)              |
| tailwind-merge                   | 3.7.0             | 2026-10-19 | latest stable                                                                  |
| tailwindcss                      | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| tauri-plugin-deep-link           | 2.6.2             | 2026-10-19 | latest stable; scheme registration                                             |
| tauri-plugin-log                 | 2.10.1            | 2026-10-19 | latest stable; rotating log file (5 x 2MB)                                     |
| tauri-plugin-opener              | 2.7.2             | 2026-10-19 | latest stable; system browser                                                  |
| tauri-plugin-store               | 2.5.0             | 2026-10-19 | latest stable (rustc 1.99.1); settings file in app data dir                    |
| tauri-plugin-window-state        | 2.5.0             | 2026-10-19 | latest stable (rustc 1.99.1); window size/position                             |
| tauri-specta                     | 2.0.0-rc.25       | 2026-10-19 | pre-release, exact pin (`=`) approved for Tauri 2 (see Deviations)             |
| thiserror                        | 2.0.21            | 2026-10-19 | latest stable; AppError                                                        |
| tsx                              | 4.23.15           | 2026-10-19 | latest stable                                                                  |
| turbo                            | 2.11.9            | 2026-10-19 | latest stable                                                                  |
| typescript                       | 6.0.3             | 2026-10-19 | pinned below <6.1.0 for typescript-eslint@8.71.2 peer range (TS 7 unsupported) |
| typescript-eslint                | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| vite                             | 8.3.4             | 2026-10-19 | latest stable                                                                  |
| vitest                           | 5.0.5             | 2026-10-19 | latest stable                                                                  |
| zod                              | 4.6.7             | 2026-10-19 | latest stable; packages/shared schemas + desktop env config                    |
| zustand                          | 5.0.15            | 2026-10-19 | latest stable                                                                  |

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

- **Rate limiting is per API instance (M3.2)**: Better Auth's limiter uses memory storage; `storage: "database"` would add a `rateLimit` table and is deferred until the API scales beyond one instance. The desktop routes use a small in-memory limiter for the same reason.
- **Desktop PKCE challenges live in `verification` (M3 review item 7)**: rows are keyed by `desktop-pkce:<sha256(ott)>` and deleted on use; they expire with the OTT (3 minutes).

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
