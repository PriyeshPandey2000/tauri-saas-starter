# M0: Scaffold & Tooling

**Goal:** Empty-but-correct monorepo. App window opens. All quality tools green.
**Prereqs:** Node 22 LTS, pnpm 9+, Rust stable, Tauri 2 prerequisites installed.

## Tasks

- [x] 0.1 Init git repo, `.gitignore` (node_modules, target, dist, .env*, .DS_Store), `.editorconfig`.
- [x] 0.2 pnpm workspace (`pnpm-workspace.yaml`) with `apps/*` and `packages/*`. Add Turborepo (`turbo.json`) with `build`, `dev`, `lint`, `typecheck`, `test` pipelines.
- [x] 0.3 `packages/config`: shared `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), ESLint flat config (typescript-eslint, react-hooks, boundaries), Prettier config.
- [x] 0.4 `packages/shared` (`@app/shared`) with `APP_NAME` export.
- [x] 0.5 `apps/desktop`: Tauri 2 + React 19 + TS + Vite 8. Alias `@/` -> `src/` in Vite + tsconfig.
- [x] 0.6 Tailwind v4 + shadcn/ui (`components.json`, `@/shared/ui/button.tsx`).
- [x] 0.7 Folder skeleton (`app/ routes/ features/ shared/ ports/`) with `.gitkeep`.
- [x] 0.8 `apps/api`: Hono 4, `GET /health` -> `{ "ok": true }`.
- [x] 0.9 `src-tauri/Cargo.toml` release profile (lto, codegen-units=1, opt-level="s", strip, panic=abort).
- [x] 0.10 Strict CSP + minimal capabilities (`core:default`).
- [x] 0.11 husky + lint-staged (eslint + prettier on staged). NOTE: commit-msg hook added in 0.17.
- [x] 0.12 Root scripts: dev/build/lint/lint:arch/check-vendor-imports/typecheck/test/format.
- [x] 0.13 Vitest in `apps/desktop`, one passing test.
- [x] 0.14 Latest stable deps; `DECISIONS.md` table; `.npmrc`; engines; packageManager; rust-toolchain.
- [x] 0.15 Architecture enforcement via eslint-plugin-boundaries + `pnpm lint:arch` (see report; scratch violation proven then deleted).
- [x] 0.17 commitlint.config.ts + scope-enum; husky commit-msg hook (bad message rejection proven).
- [x] 0.16 `check-vendor-imports` script (fails on `@sentry/*`/`posthog-*`/`better-auth` outside `ports/adapters/`).

## Acceptance criteria

- `pnpm install` clean on fresh clone.
- `pnpm lint:arch` passes on clean tree and fails on a violating import (evidence pasted).
- `DECISIONS.md` version table lists every installed dependency; none are pre-release.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` all exit 0.
- `pnpm --filter desktop tauri dev` opens a window showing the shadcn Button. (not executed here)
- `pnpm --filter api dev` serves `/health`.
- `pnpm --filter desktop tauri build` produces an installer. (not executed here)
- No `any`, no TS errors, no eslint warnings.

## Out of scope

Routing, auth, state, DB, anything not listed.

## Verification commands (paste output in report)

```
pnpm lint && pnpm typecheck && pnpm test
curl localhost:8787/health
pnpm --filter desktop tauri build   # note installer size
```

## Review checklist (reviewer)

- [ ] Workspace boundaries correct, no cross-app relative imports.
- [ ] Release profile present, CSP strict, capabilities minimal.
- [ ] Path alias works in both Vite and tsconfig.
- [ ] No unused deps.

## Agent report

Environment: Node v24.18.0, pnpm 10.14.0, rustc 1.90.0. Date 2026-10-19.

### `pnpm lint` (exit 0)

```
 Tasks:    4 successful, 4 total
check-vendor-imports: OK (no vendor SDK imports outside ports/adapters)
```

### `pnpm typecheck` (exit 0)

```
 Tasks:    3 successful, 3 total
```

### `pnpm test` (exit 0)

```
api:  Test Files 1 passed (1)   Tests 1 passed (1)
desktop:  Test Files 1 passed (1)   Tests 1 passed (1)
 Tasks:    2 successful, 2 total
```

### `pnpm build` (exit 0)

```
 Tasks:    3 successful, 3 total
@app/shared:build: tsc -p tsconfig.json
api:build: tsc
desktop:build: tsc && vite build  ->  ✓ built in 343ms
```

### M0.10 capabilities

`apps/desktop/src-tauri/capabilities/default.json` permissions = `["core:default"]` only. The scaffold-default `tauri-plugin-opener` (npm dep, Rust crate, plugin registration, and `opener:default` capability) was removed to keep capabilities minimal and deps used.

### M0.15 arch-rule proof (`pnpm lint:arch` on scratch files; files deleted after)

```
apps/desktop/src/app/shell.ts
  1:30  error  There is no policy allowing dependencies from elements of type "app" to elements of type "feature"  boundaries/dependencies

apps/desktop/src/features/billing/index.ts
  1:29  error  ... from "feature" featureName="billing" to "feature" featureName="auth"  boundaries/dependencies
  2:31  error  ... from "feature" featureName="billing" to "adapter" adapterName="posthog"  boundaries/dependencies

apps/desktop/src/ports/other.ts
  1:31  error  ... from "port" to "adapter" adapterName="posthog"  boundaries/dependencies
```

`ports/index.ts` importing the same adapter produced no error (composition root allowed). Scratch files deleted; `pnpm lint:arch` now exits 0.

### M0.16 vendor guard proof (scratch file, deleted after)

```
Vendor SDK imported outside ports/adapters/:
  apps/desktop/src/features/auth/vendor-scratch.ts: @sentry/react
ELIFECYCLE  Command failed with exit code 1.
```

### M0.17 commitlint proof

```
$ git commit -m "stuff"
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
husky - commit-msg script failed (code 1)
```

### `curl localhost:8787/health`

```
HTTP/1.1 200 OK
{"ok":true}
```

### Not run

- `pnpm --filter desktop tauri build` (full Rust/installer build) not executed in this session; needs local Tauri prerequisites and time.
- Fresh-clone `pnpm install` not executed; `pnpm install` on the working tree is clean.

## Review

**Verdict: PASS** (2026-10-19), with follow-ups below that do not block M1.

Independently verified by reviewer (not from agent report):

- `turbo run lint typecheck test --force` (no cache): 9/9 tasks pass.
- Fresh clone + `pnpm install --frozen-lockfile` + lint/typecheck/test: all pass.
- `pnpm --filter desktop tauri build`: succeeds (mac aarch64). Installer .dmg 1.5 MiB, .app 3.1 MiB (budget 15 MB).
- App launches; window shows shadcn Button (screenshot).
- Boundary rule fails on: feature -> other feature import; shared -> feature import. No `any`, `@ts-ignore`, or `eslint-disable` in source. No secrets or `.env` tracked. Release profile, minimal capabilities (`core:default`), and CSP present.

Follow-ups (fix at the start of M1, one commit each):

1. `apps/desktop/src-tauri/Cargo.lock` is untracked. Commit it (apps must track their lockfile).
2. Placeholder naming: `productName`/window title `appsdesktop`, identifier `com.priyesh.appsdesktop`, and the heading text `desktop-app-boilerplate`. Rename `productName` to `Tauri SaaS Starter` and the identifier to `com.example.tauri-saas-starter` (final values set by M10 init script). Replace the heading with a real placeholder.
3. CSP `connect-src` includes `localhost:1420` and `ws://localhost:1420` in the production config. Move dev-only origins to a dev-only override (`devCsp`) in M2/M9; track in DECISIONS.md backlog.
4. Not independently re-proven: `check-vendor-imports` rejecting a violation, and app/routes deep imports into `features/x/internal`. Add a unit test for the guard script and a boundaries test fixture in M9.11.
5. Lint passes while pnpm warns that `eslint-plugin-import` has an eslint 10 peer mismatch. Accepted for now; revisit if it breaks.
