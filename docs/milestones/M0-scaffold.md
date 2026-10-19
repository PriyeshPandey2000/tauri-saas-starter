# M0: Scaffold & Tooling

**Goal:** Empty-but-correct monorepo. App window opens. All quality tools green.
**Prereqs:** Node 22 LTS, pnpm 9+, Rust stable, Tauri 2 prerequisites installed.

## Tasks
- [ ] 0.1 Init git repo, `.gitignore` (node_modules, target, dist, .env*, .DS_Store), `.editorconfig`.
- [ ] 0.2 pnpm workspace (`pnpm-workspace.yaml`) with `apps/*` and `packages/*`. Add Turborepo (`turbo.json`) with `build`, `dev`, `lint`, `typecheck`, `test` pipelines.
- [ ] 0.3 `packages/config`: shared `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), ESLint flat config (typescript-eslint, react-hooks, import order), Prettier config.
- [ ] 0.4 `packages/shared`: empty TS package exporting a placeholder `export const APP_NAME`. Builds with `tsc`.
- [ ] 0.5 `apps/desktop`: create with Tauri 2 + React + TS + Vite template. Wire to shared tsconfig and eslint config. Path alias `@/` -> `src/`.
- [ ] 0.6 Install and configure Tailwind v4 and shadcn/ui (`components.json`, `shared/ui/`). Add `Button` component only.
- [ ] 0.7 Create the folder skeleton from PRD section 4 (`app/ routes/ features/ shared/ ports/`) with `.gitkeep`.
- [ ] 0.8 `apps/api`: Hono hello-world with `GET /health` returning `{ ok: true }`. Runs with `pnpm --filter api dev`.
- [ ] 0.9 Tauri release profile in `src-tauri/Cargo.toml`: `lto = true`, `codegen-units = 1`, `opt-level = "s"`, `strip = true`, `panic = "abort"`.
- [ ] 0.10 Strict CSP in `tauri.conf.json` (default-src 'self'; allow only what dev needs). Empty capabilities except `core:default`.
- [ ] 0.11 Husky + lint-staged: run eslint + prettier on staged files. Commitlint not required.
- [ ] 0.12 Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`.
- [ ] 0.13 Vitest set up in `apps/desktop` with one trivial passing test.

- [ ] 0.14 **Latest versions.** Per PRD rule 14: scaffold with the current official Tauri 2 create tool, add every dependency at latest stable, check Tauri/plugin version alignment, and fill the "Dependency versions" table in `DECISIONS.md`. Add `.npmrc` with `engine-strict=true`, set `engines` and `packageManager` in root `package.json`, and add `rust-toolchain.toml` pinned to current stable.
- [ ] 0.15 **Architecture enforcement.** Install `eslint-plugin-boundaries` and encode PRD rule 15 in `packages/config`: element types (`app`, `routes`, `feature`, `shared`, `port`, `adapter`) and allowed import directions. Add rule that features may import other features only never (public API `index.ts` only for `app`/`routes`). Add `pnpm lint:arch` script and include in root `lint`. Add a deliberately bad import in a scratch file to prove the rule fails, paste output, then delete the scratch file.
- [ ] 0.16 Add a `check-vendor-imports` test/script: fails if `@sentry/*`, `posthog-*`, `better-auth`, or other vendor SDKs are imported outside `ports/adapters/`. (Vendors not yet installed are fine; list is extended as milestones add them.)

## Acceptance criteria
- `pnpm install` clean on fresh clone.
- `pnpm lint:arch` passes on clean tree and fails on a violating import (evidence pasted).
- `DECISIONS.md` version table lists every installed dependency; none are pre-release.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` all exit 0.
- `pnpm --filter desktop tauri dev` opens a window showing the shadcn Button.
- `pnpm --filter api dev` serves `/health`.
- `pnpm --filter desktop tauri build` produces an installer.
- No `any`, no TS errors, no eslint warnings.

## Out of scope
Routing, auth, state, DB, anything not listed.

## Verification commands (paste output in report)
```
pnpm lint && pnpm typecheck && pnpm test
curl localhost:<port>/health
pnpm --filter desktop tauri build   # note installer size
```

## Review checklist (reviewer)
- [ ] Workspace boundaries correct, no cross-app relative imports.
- [ ] Release profile present, CSP strict, capabilities minimal.
- [ ] Path alias works in both Vite and tsconfig.
- [ ] No unused deps.

## Agent report
_(agent fills)_

## Review
_(reviewer fills)_
