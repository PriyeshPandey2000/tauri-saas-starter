# Decisions Log (append-only)

Agent: record any deviation from PRD.md here with date, what, why. Do not edit past entries.

## Dependency versions (agent maintains; one row per dependency)

| Package / crate                  | Version installed | Date       | Notes                                                                          |
| -------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------ |
| @commitlint/cli                  | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @commitlint/config-conventional  | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @eslint/js                       | 10.0.1            | 2026-10-19 | latest stable                                                                  |
| @hookform/resolvers              | 6.0.0             | 2026-10-19 | latest stable; zod resolver for RHF                                            |
| @radix-ui/react-slot             | 1.5.0             | 2026-10-19 | latest stable                                                                  |
| @tanstack/react-query            | 5.104.4           | 2026-10-19 | latest stable                                                                  |
| @tanstack/react-router           | 1.170.45          | 2026-10-19 | latest stable                                                                  |
| @tanstack/router-cli             | 1.167.45          | 2026-10-19 | latest stable; `tsr generate` route tree                                       |
| @tanstack/router-plugin          | 1.168.47          | 2026-10-19 | latest stable; Vite file-based route generation                                |
| @tailwindcss/vite                | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/api                  | 2.12.4            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/cli                  | 2.12.3            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/plugin-store         | 2.5.0             | 2026-10-19 | latest stable; settings persistence                                            |
| @tauri-apps/plugin-window-state  | 2.5.0             | 2026-10-19 | latest stable; window size/position                                            |
| @types/node                      | 26.6.5            | 2026-10-19 | latest stable                                                                  |
| @types/react                     | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @types/react-dom                 | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/eslint-plugin | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/parser        | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @vitejs/plugin-react             | 6.1.2             | 2026-10-19 | latest stable                                                                  |
| class-variance-authority         | 0.7.1             | 2026-10-19 | latest stable                                                                  |
| clsx                             | 2.1.1             | 2026-10-19 | latest stable                                                                  |
| cmdk                             | 1.1.1             | 2026-10-19 | latest stable; command palette                                                 |
| eslint                           | 10.13.0           | 2026-10-19 | latest stable                                                                  |
| eslint-import-resolver-alias     | 1.1.2             | 2026-10-19 | resolves `@/*` for eslint-plugin-boundaries (see Deviations)                   |
| eslint-plugin-boundaries         | 7.2.0             | 2026-10-19 | latest stable                                                                  |
| eslint-plugin-import             | 2.32.0            | 2026-10-19 | resolver infrastructure for boundaries; peer warns on eslint 10                |
| eslint-plugin-react-hooks        | 7.1.1             | 2026-10-19 | latest stable                                                                  |
| hono                             | 4.13.13           | 2026-10-19 | latest stable                                                                  |
| husky                            | 9.1.7             | 2026-10-19 | latest stable                                                                  |
| i18next                          | 26.5.2            | 2026-10-19 | latest stable                                                                  |
| jsdom                            | 30.1.3            | 2026-10-19 | latest stable                                                                  |
| lint-staged                      | 17.6.0            | 2026-10-19 | latest stable                                                                  |
| lucide-react                     | 1.59.0            | 2026-10-19 | latest stable                                                                  |
| prettier                         | 3.9.10            | 2026-10-19 | latest stable                                                                  |
| react                            | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-dom                        | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-hook-form                  | 7.90.0            | 2026-10-19 | latest stable                                                                  |
| react-i18next                    | 17.1.0            | 2026-10-19 | latest stable                                                                  |
| sonner                           | 2.0.8             | 2026-10-19 | latest stable; toasts                                                          |
| tailwind-merge                   | 3.7.0             | 2026-10-19 | latest stable                                                                  |
| tailwindcss                      | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| tauri-plugin-store               | 2.5.0             | 2026-10-19 | latest stable (rustc 1.99.1); settings file in app data dir                    |
| tauri-plugin-window-state        | 2.5.0             | 2026-10-19 | latest stable (rustc 1.99.1); window size/position                             |
| tsx                              | 4.23.15           | 2026-10-19 | latest stable                                                                  |
| turbo                            | 2.11.9            | 2026-10-19 | latest stable                                                                  |
| typescript                       | 6.0.3             | 2026-10-19 | pinned below <6.1.0 for typescript-eslint@8.71.2 peer range (TS 7 unsupported) |
| typescript-eslint                | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| vite                             | 8.3.4             | 2026-10-19 | latest stable                                                                  |
| vitest                           | 5.0.5             | 2026-10-19 | latest stable                                                                  |
| zod                              | 4.6.7             | 2026-10-19 | latest stable; schemas in packages/shared                                      |
| zustand                          | 5.0.15            | 2026-10-19 | latest stable                                                                  |

## Deviations

- **TypeScript version pin**: pinned TypeScript to `~6.0.3` (6.0.3) in root and all workspaces instead of `^7.0.2`. Reason: `typescript-eslint@8.71.2` peer range is `typescript >=4.8.4 <6.1.0` and does not support TS 7.0 yet. Revisit: when typescript-eslint ships stable support for TypeScript 7.
- **Module resolution for boundaries**: use `eslint-import-resolver-alias` (map `@` -> `apps/desktop/src`, `@app/shared` -> `packages/shared/src`) instead of `eslint-import-resolver-typescript`. Reason: `eslint-import-resolver-typescript@4.4.5` fails to resolve `@/*` path mappings when the tsconfig uses a relative `baseUrl` under TypeScript 6 (returns `found: false`), which would make `eslint-plugin-boundaries` classify local imports as external and silently skip the rule 15 checks. Revisit: when the TypeScript resolver supports TS 6 relative `baseUrl`.
- **Rust toolchain bump (M1)**: updated the local `stable` toolchain from rustc 1.89.0 to 1.99.1. Reason: the latest `tauri-plugin-store` 2.5.0 and `tauri-plugin-window-state` 2.5.0 crates require rustc >= 1.90 (rule 14: install latest stable deps). `rust-toolchain.toml` still pins `channel = "stable"`, so CI resolves the same latest stable. Alternative was pinning older crates; rejected to stay on latest stable.
- **Shared package excluded from boundaries classification**: added `**/packages/shared/**` to `boundaries/ignore`. Reason: `@app/shared` resolves outside `apps/desktop/src`, so the plugin classified it as an `entry` element and rejected `feature -> @app/shared` imports. Shared is importable by every layer anyway, so ignoring it preserves the rule 15 intent.

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
