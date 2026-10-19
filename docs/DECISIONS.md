# Decisions Log (append-only)

Agent: record any deviation from PRD.md here with date, what, why. Do not edit past entries.

## Dependency versions (agent maintains; one row per dependency)

| Package / crate                  | Version installed | Date       | Notes                                                                          |
| -------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------ |
| @commitlint/cli                  | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @commitlint/config-conventional  | 21.2.4            | 2026-10-19 | latest stable                                                                  |
| @eslint/js                       | 10.0.1            | 2026-10-19 | latest stable                                                                  |
| @radix-ui/react-slot             | 1.5.0             | 2026-10-19 | latest stable                                                                  |
| @tailwindcss/vite                | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/api                  | 2.12.4            | 2026-10-19 | latest stable                                                                  |
| @tauri-apps/cli                  | 2.12.3            | 2026-10-19 | latest stable                                                                  |
| @types/node                      | 26.6.5            | 2026-10-19 | latest stable                                                                  |
| @types/react                     | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @types/react-dom                 | 19.3.0            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/eslint-plugin | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @typescript-eslint/parser        | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| @vitejs/plugin-react             | 6.1.2             | 2026-10-19 | latest stable                                                                  |
| class-variance-authority         | 0.7.1             | 2026-10-19 | latest stable                                                                  |
| clsx                             | 2.1.1             | 2026-10-19 | latest stable                                                                  |
| eslint                           | 10.13.0           | 2026-10-19 | latest stable                                                                  |
| eslint-import-resolver-alias     | 1.1.2             | 2026-10-19 | resolves `@/*` for eslint-plugin-boundaries (see Deviations)                   |
| eslint-plugin-boundaries         | 7.2.0             | 2026-10-19 | latest stable                                                                  |
| eslint-plugin-import             | 2.32.0            | 2026-10-19 | resolver infrastructure for boundaries; peer warns on eslint 10                |
| eslint-plugin-react-hooks        | 7.1.1             | 2026-10-19 | latest stable                                                                  |
| hono                             | 4.13.13           | 2026-10-19 | latest stable                                                                  |
| husky                            | 9.1.7             | 2026-10-19 | latest stable                                                                  |
| jsdom                            | 30.1.3            | 2026-10-19 | latest stable                                                                  |
| lint-staged                      | 17.6.0            | 2026-10-19 | latest stable                                                                  |
| lucide-react                     | 1.59.0            | 2026-10-19 | latest stable                                                                  |
| prettier                         | 3.9.10            | 2026-10-19 | latest stable                                                                  |
| react                            | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| react-dom                        | 19.3.1            | 2026-10-19 | latest stable                                                                  |
| tailwind-merge                   | 3.7.0             | 2026-10-19 | latest stable                                                                  |
| tailwindcss                      | 4.3.3             | 2026-10-19 | latest stable                                                                  |
| tsx                              | 4.23.15           | 2026-10-19 | latest stable                                                                  |
| turbo                            | 2.11.9            | 2026-10-19 | latest stable                                                                  |
| typescript                       | 6.0.3             | 2026-10-19 | pinned below <6.1.0 for typescript-eslint@8.71.2 peer range (TS 7 unsupported) |
| typescript-eslint                | 8.71.2            | 2026-10-19 | latest stable                                                                  |
| vite                             | 8.3.4             | 2026-10-19 | latest stable                                                                  |
| vitest                           | 5.0.5             | 2026-10-19 | latest stable                                                                  |

## Deviations

- **TypeScript version pin**: pinned TypeScript to `~6.0.3` (6.0.3) in root and all workspaces instead of `^7.0.2`. Reason: `typescript-eslint@8.71.2` peer range is `typescript >=4.8.4 <6.1.0` and does not support TS 7.0 yet. Revisit: when typescript-eslint ships stable support for TypeScript 7.
- **Module resolution for boundaries**: use `eslint-import-resolver-alias` (map `@` -> `apps/desktop/src`, `@app/shared` -> `packages/shared/src`) instead of `eslint-import-resolver-typescript`. Reason: `eslint-import-resolver-typescript@4.4.5` fails to resolve `@/*` path mappings when the tsconfig uses a relative `baseUrl` under TypeScript 6 (returns `found: false`), which would make `eslint-plugin-boundaries` classify local imports as external and silently skip the rule 15 checks. Revisit: when the TypeScript resolver supports TS 6 relative `baseUrl`.

## Backlog (ideas out of current scope)

- Two-way sync + conflict resolution
- Encryption at rest for local DB
- Teams / roles / seats
- MFA, magic links
- Usage-based billing
- Linux support
- Session replay, perf tracing
- Store distribution (MSIX / Mac App Store)
