# M10: Template Hygiene

**Goal:** New SaaS idea from this boilerplate in under an hour.
**Prereqs:** M9 PASS.

## Tasks
- [ ] 10.1 `scripts/init-project.ts` (interactive, run via `pnpm init:project`): asks app name, slug, bundle identifier, deep-link scheme, org/author, API URL. Replaces placeholders everywhere (package names, `tauri.conf.json`, `Cargo.toml`, keychain service name, deep-link scheme, window title, i18n strings). Idempotent; refuses to run on a dirty git tree unless `--force`.
- [ ] 10.2 Feature removal helper `pnpm feature:remove <name>` for `notes`, `billing`, `flags`: deletes feature folder, routes, nav/command registrations, port wiring, API routes, migrations entry, and flag/analytics event entries. Must leave the project compiling (script runs typecheck at end and reports).
- [ ] 10.3 `pnpm feature:new <name>` generator: scaffolds `features/<name>/{components,hooks,api,store}/index.ts`, a route file, nav registration, and a test stub.
- [ ] 10.4 Replace placeholder branding: neutral app icon source (`app-icon.png` 1024px) + `pnpm tauri icon` instructions in docs.
- [ ] 10.5 `SETUP.md`: prerequisites, first run, env vars table (every var, required/optional, where to get it), accounts to create (Postgres host, Google OAuth, Dodo, PostHog, Sentry, Apple/Windows signing).
- [ ] 10.6 `ARCHITECTURE.md`: diagram (text), data flow, ports table (port -> default adapter -> how to swap), rules recap.
- [ ] 10.7 `docs/new-idea-checklist.md`: ordered steps to launch a new product from the template (init, remove unused features, brand, pricing plans, flags, legal pages, release).
- [ ] 10.8 Final audit: remove dead code, unused deps (`knip` or `depcheck`), confirm every doc command works from scratch on a clean clone. Record result in report.

## Acceptance criteria
- Clone fresh, run `init:project` with a sample name, `feature:remove notes`, build + tests pass.
- `feature:new todos` yields a working empty feature visible in nav.
- Docs commands verified on a clean clone (agent lists each command run).
- Zero leftover references to the template placeholder name (grep proves).

## Out of scope
Publishing template as a GitHub template repo (user does manually).

## Verification commands
```
pnpm init:project -- --dry-run
pnpm feature:remove notes && pnpm typecheck && pnpm test
pnpm feature:new todos && pnpm typecheck
npx knip
```

## Review checklist
- [ ] Init script is safe and reversible via git.
- [ ] Removal leaves no dangling imports/routes/migrations.
- [ ] Docs match reality.

## Agent report
_(agent fills)_

## Review
_(reviewer fills)_
