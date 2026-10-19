# PRD: Desktop SaaS Boilerplate

## 1. Goal

Reusable desktop app template. Spin up a new SaaS idea in hours: rename, delete unused feature modules, add new ones. Fast, small, secure, extendable.

## 2. Non-goals

- No product-specific features.
- No pixel-perfect cross-OS rendering.
- Linux is out of scope for v1 (mac + Windows first).
- No mobile.

## 3. Locked decisions (change here first, then tell the agent)

| Area             | Choice                                                                                                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell            | Tauri 2                                                                                                                                                                                                                                                     |
| Frontend         | React + TypeScript (strict) + Vite                                                                                                                                                                                                                          |
| Styling          | Tailwind v4 + shadcn/ui (Radix)                                                                                                                                                                                                                             |
| Routing          | TanStack Router (file-based)                                                                                                                                                                                                                                |
| Server state     | TanStack Query                                                                                                                                                                                                                                              |
| Client state     | Zustand                                                                                                                                                                                                                                                     |
| Forms/validation | React Hook Form + Zod                                                                                                                                                                                                                                       |
| i18n             | i18next                                                                                                                                                                                                                                                     |
| Monorepo         | pnpm workspaces + Turborepo                                                                                                                                                                                                                                 |
| API              | Hono (TypeScript) in `apps/api`                                                                                                                                                                                                                             |
| DB (remote)      | Postgres + Drizzle ORM. Host-agnostic: only `DATABASE_URL` (pooled, runtime) and `DATABASE_URL_DIRECT` (unpooled, migrations) are read from env. Default host: Neon. No host-specific SDK/feature may be used outside one `apps/api/src/db/client.ts` file. |
| DB (local)       | SQLite via tauri-plugin-sql, WAL mode                                                                                                                                                                                                                       |
| Auth             | Better Auth (server in `apps/api`), OAuth via deep link + system browser, tokens in OS keychain                                                                                                                                                             |
| Feature flags    | PostHog flags behind a `FeatureFlagPort`, with local JSON override fallback                                                                                                                                                                                 |
| Billing          | Dodo Payments (merchant of record) behind a `BillingPort`                                                                                                                                                                                                   |
| Errors           | Sentry (JS + Rust)                                                                                                                                                                                                                                          |
| Analytics        | PostHog, consent-gated                                                                                                                                                                                                                                      |
| Tests            | Vitest (unit), Playwright (e2e), cargo test (Rust)                                                                                                                                                                                                          |
| CI               | GitHub Actions, `tauri-action` matrix (mac, win)                                                                                                                                                                                                            |
| Targets          | macOS 12+, Windows 10 22H2+ / 11                                                                                                                                                                                                                            |

Open assumptions: app is online-first with local cache (not full offline sync). Sync is a future milestone.

## 4. Repo layout

```
/
  apps/
    desktop/            Tauri app
      src/              React frontend
        app/            providers, router setup, root layout
        routes/         TanStack file routes
        features/       one folder per feature (auth, billing, flags, settings, ...)
          <feature>/
            components/ hooks/ api/ store/ index.ts
        shared/         ui/, lib/, hooks/, types/
        ports/          interfaces + adapters (see rules)
      src-tauri/        Rust
        src/commands/   one file per domain
        src/lib.rs
        capabilities/   Tauri permission files
    api/                Hono server
    web/                landing + download page (Astro or Next, later)
  packages/
    shared/             Zod schemas + types used by desktop and api
    config/             eslint, tsconfig, tailwind presets
  docs/
    PRD.md
    milestones/
    DECISIONS.md        append-only log of any deviation
```

## 5. Engineering rules (agent MUST follow)

1. **Feature modules are isolated.** A feature imports only from `shared/`, `ports/`, and its own folder. Features never import each other; they communicate through ports, router, or events.
2. **Ports and adapters.** Every third-party service (auth, billing, flags, analytics, error reporting, storage, logging) is used ONLY through an interface in `src/ports/`. Adapters live in `src/ports/adapters/`. UI code never imports a vendor SDK directly.
3. **Typed IPC.** Rust commands are exposed to TS via `tauri-specta` generated bindings. No raw `invoke("string")` calls outside the generated file.
4. **No secrets in the frontend.** Tokens go in the OS keychain via Rust. Never localStorage/sessionStorage. Never log tokens.
5. **Validate at boundaries.** All API responses, IPC results, env config, and persisted settings are parsed with Zod.
6. **Strict TS.** `strict: true`, no `any`, no `@ts-ignore` without a comment explaining why.
7. **Rust commands are async** and never block the main thread; CPU work uses `spawn_blocking`.
8. **Security.** Strict CSP, Tauri capabilities deny-by-default, only allow what a feature uses. No `eval`, no remote scripts.
9. **Perf budgets** (checked in CI from M9): cold start to interactive < 1.5s on reference machine, idle RAM < 150MB, JS initial bundle < 300KB gzip, installer < 15MB.
10. **Meaningful commits, Conventional Commits format.** Commit per coherent unit of work, not per checkbox: a typical milestone is 3 to 8 commits (a feature slice such as "api auth routes + tests" is one commit; tests ship in the same commit as the code they cover). A review-fix round is ONE commit per theme at most (usually one for the whole round), never one per finding. Reports, review notes, deferred-check lists and `DECISIONS.md` updates go into the commit that caused them, or a single `docs` commit at the end of the milestone; never a docs commit per small edit. Do not commit a fix for your own commit made minutes earlier: amend it (unpushed commits only). Format: `<type>(<scope>): <subject>` with an optional body and footer. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Scope is the area touched (`desktop`, `api`, `shared`, `config`, `ci`, `docs`, or a feature name like `auth`). Subject: imperative mood, lowercase, no trailing period, max 72 chars (e.g. `feat(auth): add oauth deep link callback`). Put the milestone task reference in the footer, e.g. `Refs: M3.5`. Breaking changes use `!` after the scope and a `BREAKING CHANGE:` footer. Commit messages are enforced by commitlint (M0.17). Do not rewrite history already committed before this rule existed.
11. **No scope creep.** If something is not in the milestone, don't build it. Log ideas in `docs/DECISIONS.md` under "Backlog".
12. **Ask, don't guess.** If a task is ambiguous or a locked decision blocks you, STOP and write the question in `docs/milestones/M<n>-questions.md`. Do not invent a workaround.
13. **Match existing style.** Read neighboring files first. Reuse existing helpers.
14. **Latest stable versions.** When adding ANY dependency (npm, crates, Tauri plugins, GitHub Actions), install the latest stable release (`pnpm add <pkg>@latest`, `cargo add <crate>`), never from memory and never pre-release/rc/beta. Before using an API, read that version's official docs or changelog; training-data examples may be outdated. Tauri plugin versions must match the Tauri core major/minor line. Record every added dependency and version in the "Dependency versions" table in `docs/DECISIONS.md`. If the latest stable has a breaking change that conflicts with this PRD, STOP and ask (rule 12). Commit lockfiles. Do not add a dependency if platform APIs or an existing dependency already cover the need. Exception: a pre-release is allowed ONLY when no stable release supports the required major version of a locked-stack dependency, the reviewer approves it in writing, and it is pinned exactly and logged in `docs/DECISIONS.md`.
15. **Dependency boundaries are enforced by tooling, not convention.** `eslint-plugin-boundaries` (or `dependency-cruiser`) config encodes: `routes/app -> features -> shared + ports`; features never import other features; features import each other's code never, only `features/x/index.ts` public API from `app/` or `routes/`; `ports/adapters/*` are imported only by `ports/index.ts`; vendor SDKs only inside adapters. A violation fails lint and CI. Do not disable the rule or add exceptions without a `DECISIONS.md` entry approved by the reviewer.
16. **Earn shared code.** Move code to `shared/` only when a second consumer exists. No speculative abstractions.

## 6. Workflow

For each milestone:

1. Agent reads `PRD.md` + the milestone file only.
2. Agent completes tasks in order, ticking each checkbox in the milestone file.
3. Agent runs the milestone's **Verification commands** and pastes output into the milestone file under `## Agent report`.
4. Agent stops. **Do not start the next milestone.**
5. Reviewer (Claude) reviews against the **Acceptance criteria** and **Review checklist**, writes findings under `## Review`, and marks PASS or CHANGES REQUIRED.
6. On CHANGES REQUIRED, agent fixes only the listed findings, re-reports.
7. Only after PASS does the next milestone begin.

## 7. Agent handoff prompt (copy/paste per milestone)

```
You are implementing one milestone of a desktop app boilerplate.
Read docs/PRD.md fully, then docs/milestones/M<N>-<name>.md.
Follow the Engineering rules strictly. Do only the tasks listed.
Tick checkboxes as you finish. Run the Verification commands and paste
the real output into "Agent report". If blocked or unsure, write the
question in docs/milestones/M<N>-questions.md and stop. Do not begin
any other milestone.
```

## 8. Milestone index

| #   | Name                | Outcome                                                                   |
| --- | ------------------- | ------------------------------------------------------------------------- |
| M0  | Scaffold & tooling  | Monorepo builds, app window opens, lint/format/typecheck green            |
| M1  | App shell           | Layout, routing, theming, settings store, window state, error boundaries  |
| M2  | Core infrastructure | Config/env, logger, ports skeleton, typed IPC, secure storage             |
| M3  | Auth                | Sign up/in/out, OAuth deep link, keychain tokens, route guards            |
| M4  | Local data layer    | SQLite + migrations, repository pattern, Query integration, API client    |
| M5  | Feature flags       | Flag port, PostHog adapter, local overrides, `<Flag>` + hook, kill-switch |
| M6  | Billing & licensing | Plans, checkout, webhooks, entitlement gate, offline grace                |
| M7  | Observability       | Sentry, PostHog analytics, consent UI, log file rotation                  |
| M8  | Native features     | Tray, global shortcuts, deep links, single instance, auto-update          |
| M9  | Quality & release   | Tests, CI, perf budgets, signing, release pipeline                        |
| M10 | Template hygiene    | Rename script, SETUP.md, example feature, docs                            |
