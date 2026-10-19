# Decisions Log (append-only)

Agent: record any deviation from PRD.md here with date, what, why. Do not edit past entries.

## Dependency versions (agent maintains; one row per dependency)
| Package / crate | Version installed | Date | Notes |
|---|---|---|---|
| _(none yet)_ | | | |

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
