# Decisions Log (append-only)

Agent: record any deviation from PRD.md here with date, what, why. Do not edit past entries.

## Dependency versions (agent maintains; one row per dependency)
| Package / crate | Version installed | Date | Notes |
|---|---|---|---|
| typescript | 6.0.3 | 2026-10-19 | pinned below <6.1.0 for typescript-eslint@8.71.2 peer range (TS 7 unsupported) |
| eslint | 10.13.0 | 2026-10-19 | latest stable |
| typescript-eslint | 8.71.2 | 2026-10-19 | latest stable |
| eslint-plugin-boundaries | 7.2.0 | 2026-10-19 | latest stable |
| turbo | 2.11.9 | 2026-10-19 | latest stable |
| prettier | 3.9.10 | 2026-10-19 | latest stable |
| husky | 9.1.7 | 2026-10-19 | latest stable |
| lint-staged | 17.6.0 | 2026-10-19 | latest stable |
| commitlint | 20.1.0 | 2026-10-19 | latest stable |
| @commitlint/config-conventional | 20.1.0 | 2026-10-19 | latest stable |
| hono | 4.13.13 | 2026-10-19 | latest stable |
| vite | 8.3.4 | 2026-10-19 | latest stable |
| vitest | 5.0.5 | 2026-10-19 | latest stable |
| @tauri-apps/cli | 2.12.3 | 2026-10-19 | latest stable |
| @tauri-apps/api | 2.12.4 | 2026-10-19 | latest stable |
| react | 19.3.1 | 2026-10-19 | latest stable |
| react-dom | 19.3.1 | 2026-10-19 | latest stable |
| tailwindcss | 4.3.3 | 2026-10-19 | latest stable |
| @tailwindcss/vite | 4.3.3 | 2026-10-19 | latest stable |
| clsx | 2.1.1 | 2026-10-19 | latest stable |
| tailwind-merge | 3.7.0 | 2026-10-19 | latest stable |
| class-variance-authority | 0.7.1 | 2026-10-19 | latest stable |
| lucide-react | 1.59.0 | 2026-10-19 | latest stable |
| @radix-ui/react-slot | 1.5.0 | 2026-10-19 | latest stable |
| jsdom | 27.2.0 | 2026-10-19 | latest stable |
| tsx | 4.23.15 | 2026-10-19 | latest stable |

## Deviations
- **TypeScript version pin**: pinned TypeScript to `~6.0.3` (6.0.3) in root and all workspaces instead of `^7.0.2`. Reason: `typescript-eslint@8.71.2` peer range is `typescript >=4.8.4 <6.1.0` and does not support TS 7.0 yet. Revisit: when typescript-eslint ships stable support for TypeScript 7.

## Backlog (ideas out of current scope)
- Two-way sync + conflict resolution
- Encryption at rest for local DB
- Teams / roles / seats
- MFA, magic links
- Usage-based billing
- Linux support
- Session replay, perf tracing
- Store distribution (MSIX / Mac App Store)

## Deviations
- **TypeScript version pin**: pinned TypeScript to `~6.0.3` (6.0.3) in root and all workspaces instead of `^7.0.2`. Reason: `typescript-eslint@8.71.2` peer range is `typescript >=4.8.4 <6.1.0` and does not support TS 7.0 yet. Revisit: when typescript-eslint ships stable support for TypeScript 7.
