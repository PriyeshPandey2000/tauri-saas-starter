# M0 Questions (blocking — agent stopped)

## Q1: TypeScript major vs. typescript-eslint — latest-stable conflict (PRD rule 14)

**Status:** BLOCKED. Agent stopped after M0.11. Started M0.12/0.14.
No further tasks or commits until answered.

### Facts (verified from the npm registry, not memory)

- `typescript` `dist-tags.latest` = **7.0.2** (stable). Latest 6.x line = **6.0.3**.
- `typescript-eslint` `dist-tags.latest` = **8.71.2** (stable; no stable 9.x).
- `@typescript-eslint/parser@8.71.2` peer range:
  `typescript: ">=4.8.4 <6.1.0"` and `eslint: "^8.57.0 || ^9.0.0 || ^10.0.0"`.
- Loading the parser with TypeScript 7.0.2 throws at runtime:
  `Error: typescript-eslint does not support TS 7.0.`

### Why this is a rule-14 conflict

- PRD rule 14: install the **latest stable** version of every dependency.
- PRD rule 15: architecture boundaries **must** be enforced by
  `eslint-plugin-boundaries` (which needs typescript-eslint to parse `.ts/.tsx`).
- The two latest-stable packages are mutually incompatible: TS 7.0.2 cannot be
  used with the only stable typescript-eslint line (8.x, caps at TS 6.0.x).
- Enabling TS 7 requires the only options the parser offers — the canary
  (`8.71.3-alpha.*`, pre-release, forbidden by rule 14) or the "TS 6 side-by-side
  API" workaround — neither of which is a stable, PRD-clean choice.

## Resolution: Option 1 selected (DECISION)
- TypeScript pinned to 6.0.3 (use ~6.0.3) in root and all workspaces.
- eslint 10.13.0 + typescript-eslint 8.71.2 kept.
- Logged deviation in docs/DECISIONS.md with reason (typescript-eslint peer <6.1.0, TS 7 unsupported) and revisit (when typescript-eslint ships stable TS 7 support).
- pnpm install re-run; eslint load to be confirmed.

### Options (pick one; agent will not guess)

1. **Pin TypeScript to 6.0.3** (latest stable 6.x) for all workspaces and keep
   the latest stable toolchain (typescript-eslint 8.71.2, eslint 10.13.0).
   Log as a deviation in `DECISIONS.md`. Revisit when typescript-eslint ships
   stable TS 7 support. _(Agent's recommendation.)_
2. **Use TypeScript 7.0.2** and pin typescript-eslint to its canary line.
   Violates rule 14 (pre-release). Not recommended.
3. **Use TypeScript 7.0.2** with typescript-eslint's "TS 6 side-by-side API"
   flag. Pre-release-free but adds a second TS install and an untested config.
4. Something else the reviewer specifies.

### Impact

- Blocks: M0.12 (root scripts `lint`/`typecheck` verification), M0.13 (vitest),
  M0.14 (latest-version table), M0.15 (arch-rule proof), M0.16 (vendor-import
  check), and every Verification command.
- Repo state: M0.1–M0.11 committed. Workspace installs clean; `eslint` fails to
  load because TypeScript 7.0.2 is currently installed in `packages/config`,
  `packages/shared`, `apps/api`, `apps/desktop`.
