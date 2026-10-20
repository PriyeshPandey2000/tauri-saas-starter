<p align="center">
  <img src="docs/assets/logo.svg" alt="Tauri SaaS Starter" width="96" height="96">
</p>

<h1 align="center">Tauri SaaS Starter</h1>

<p align="center">
  A Tauri 2 starter for desktop SaaS apps. Auth, local data and the dull
  infrastructure are wired and tested, so you start on the product.
</p>

<p align="center">
  <a href="LICENSE">MIT</a> · Tauri 2 · React · TypeScript · <b>work in progress</b>
</p>

---

## Why this exists

Every desktop SaaS needs the same first month of work: sign-in, a safe place
for tokens, a local database, a backend that keeps users apart, updates,
releases. This repo does that part once, with rules that keep it clean as you
add features.

It is opinionated and small on purpose. You can read the whole thing.

## Status

Built from [`docs/PRD.md`](docs/PRD.md) in milestones. Each one is reviewed
before the next starts.

| # | Milestone | State |
|---|---|---|
| M0 | Monorepo, tooling, lint-enforced architecture | Done |
| M1 | App shell: routing, theming, settings, command palette | Done |
| M2 | Config, logging, typed IPC, OS keychain, ports | Done |
| M3 | Auth: email + Google, JWT, deep-link OAuth | Done* |
| M4 | Per-user SQLite, migrations, notes example, API | Done |
| M5 | Feature flags (PostHog) | In progress |
| M6 | Billing and licensing | Planned |
| M7 | Crash reporting and analytics with consent | Planned |
| M8 | Tray, shortcuts, single instance, auto-update | Planned |
| M9 | CI, end-to-end tests, signed releases | Planned |
| M10 | Rename script, feature generator, setup docs | Planned |

\* The Google sign-in logic is tested, but the live OAuth round trip has not
been run yet. See [`docs/deferred-checks.md`](docs/deferred-checks.md) for
everything that still needs a human.

## What is in it today

- **Desktop shell**: Tauri 2, React, TanStack Router and Query, Tailwind v4,
  shadcn/ui, light/dark theme that also drives the native title bar.
- **Auth**: Better Auth running in your own API. Short-lived JWT access tokens,
  tokens stored only in the OS keychain, PKCE-bound deep-link OAuth.
- **Per-user data**: one SQLite file per user on the desktop, and a Postgres
  backend where every query is scoped to the verified user.
- **Typed IPC**: Rust commands are exported to TypeScript, no hand-written
  `invoke("string")` calls.
- **Ports and adapters**: auth, storage, logging, billing and the rest sit
  behind interfaces. Swapping a vendor means writing one adapter.
- **Architecture checks**: import rules are lint errors, not guidelines.

The notes feature is an example that exercises the whole stack. Delete it when
you start a real product (see [Make it yours](#make-it-yours)).

## How it fits together

```mermaid
flowchart LR
  subgraph Desktop["Desktop app (Tauri 2)"]
    UI["React UI<br/>routes and features"] --> Ports["Ports<br/>interfaces"]
    Ports --> Adapters["Adapters<br/>auth, storage, logging"]
    Adapters --> Rust["Rust shell<br/>typed IPC"]
    Rust --> SQLite[("SQLite<br/>one file per user")]
    Rust --> Keychain[("OS keychain<br/>tokens")]
  end
  Adapters -- "HTTPS + JWT" --> API
  subgraph Server["Server"]
    API["Hono API<br/>Better Auth, requireAuth, notes"] --> PG[("Postgres<br/>Drizzle")]
  end
```

## Repo layout

```
apps/
  desktop/          Tauri app
    src/
      app/          providers, router, layout
      routes/       file-based routes
      features/     one folder per feature (auth, notes, settings)
      ports/        interfaces, plus adapters/ (vendor code lives only here)
      shared/       ui, lib, i18n
    src-tauri/      Rust: commands, keychain, SQLite migrations
  api/              Hono API: Better Auth, notes, Drizzle schema
packages/
  shared/           Zod schemas and types used by both apps
  config/           ESLint (with the architecture rules), TS, Prettier
docs/               PRD, milestones, decisions, setup guides
```

## Stack

| Area | Choice |
|---|---|
| Shell | Tauri 2 |
| UI | React, TypeScript (strict), Vite, Tailwind v4, shadcn/ui |
| Routing and data | TanStack Router, TanStack Query, Zustand, Zod |
| API | Hono, Better Auth, Drizzle |
| Databases | Postgres (server, any host), SQLite (desktop) |
| Tooling | pnpm workspaces, Turborepo, Vitest, commitlint |

## Quick start

You need Node 22+, pnpm, Rust (stable), the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS, and
Docker for the local database.

```bash
pnpm install
pnpm db:up                                  # Postgres 17 on localhost:5433
cp apps/api/.env.example apps/api/.env      # then edit, see below
pnpm --filter api db:migrate
pnpm --filter api dev                       # API on :8787
pnpm --filter desktop tauri dev             # desktop app
```

Minimum `apps/api/.env` for local work:

```env
DATABASE_URL=postgres://app:app@localhost:5433/app
DATABASE_URL_DIRECT=postgres://app:app@localhost:5433/app
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:8787
GOOGLE_CLIENT_ID=dummy
GOOGLE_CLIENT_SECRET=dummy
```

The Google values are required by the env schema. Placeholders are fine for
email and password sign-in. Real credentials and the OAuth steps are in
[`docs/auth-setup.md`](docs/auth-setup.md). On macOS, deep links only work in a
built app, not in `tauri dev`.

## Commands

| Command | What it does |
|---|---|
| `pnpm lint` | ESLint, architecture rules, vendor-import guard |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm test` | Vitest (API tests run on PGlite, no Docker needed) |
| `pnpm build` | Build every package |
| `pnpm db:up` / `db:down` / `db:reset` | Local Postgres |
| `pnpm --filter desktop gen:bindings` | Regenerate the Rust-to-TS bindings |

## Rules the code follows

1. **Features are isolated.** A feature imports `shared` and `ports`, never
   another feature.
2. **Vendors stay in adapters.** No SDK import outside `ports/adapters/`.
3. **No secrets in the frontend.** Tokens live in the OS keychain only.
4. **Validate at the edges.** API responses, IPC results and stored settings
   are parsed with Zod.
5. **Server decides.** Client checks are UX; the API enforces access.
6. **Conventional Commits**, enforced by commitlint.

The full list is in [`docs/PRD.md`](docs/PRD.md).

## Make it yours

The rename script and `feature:new` / `feature:remove` generators arrive in
M10. Until then: rename by hand (product name, bundle id, deep-link scheme),
and delete `features/notes`, its route, its migrations and `apps/api/src/notes`.

## Docs

- [PRD and milestones](docs/PRD.md)
- [Auth design](docs/auth-design.md) and [setup](docs/auth-setup.md)
- [Decisions and dependency versions](docs/DECISIONS.md)
- [Manual checks still open](docs/deferred-checks.md)

## Contributing

Open an issue first for anything large. Run `pnpm lint && pnpm typecheck &&
pnpm test` before a pull request and write commits in Conventional Commits
format.

## License

[MIT](LICENSE)
