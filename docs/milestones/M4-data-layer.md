# M4: Local Data Layer

**Goal:** Fast local persistence + clean data access pattern + Query integration.
**Prereqs:** M3 PASS.

## Tasks
- [ ] 4.1 Add `tauri-plugin-sql` (SQLite). DB file in app data dir, per-user file name `app-<userId>.db` (opened after sign-in, closed on sign-out via the `onSignOut` registry from M3.10).
- [ ] 4.2 On open: `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL;`.
- [ ] 4.3 Migrations: numbered SQL files in `src-tauri/migrations/` (`0001_init.sql`, ...), applied in order inside a transaction, tracked in a `_migrations` table. Include `0001_init.sql` with a sample `notes` table (id, title, body, updated_at, deleted_at). Migration failure must abort startup with a clear error screen and not corrupt data.
- [ ] 4.4 `ports/StoragePort` real adapter `SqliteStorage`: `query<T>(sql, params)`, `execute(sql, params)`, `transaction(fn)`. Params always bound, never string-concatenated.
- [ ] 4.5 Repository pattern: `shared/lib/repository.ts` base helpers. Example `features/notes/` with `NotesRepository` (list, get, create, update, softDelete) validated with Zod row schemas.
- [ ] 4.6 TanStack Query hooks for notes (`useNotes`, `useCreateNote`, ...) with query key factory, optimistic update + rollback on error for create/update/delete.
- [ ] 4.6b Remote DB migrations: Drizzle migrations for the API run via `pnpm --filter api db:migrate` using `DATABASE_URL_DIRECT`. Reuse `db/client.ts` from M3.0b; do not create a second client.
- [ ] 4.7 Remote API example: `apps/api` `GET/POST /notes` (auth-protected, Drizzle, per-user scoping enforced server-side). Desktop `NotesApi` using apiClient. Repository interface hides whether data is local or remote, so swapping is one file.
- [ ] 4.8 Query persistence: persist selected query cache to disk (via plugin-store or SQLite) so app opens with last data; exclude auth-sensitive queries; bust on sign-out.
- [ ] 4.9 Notes UI: list (virtualized with TanStack Virtual), create/edit dialog, delete with undo toast. Loading skeletons, empty state, error state.
- [ ] 4.10 Tests: migration runner (fresh + upgrade + failure), repository CRUD against in-memory SQLite, optimistic rollback.

## Acceptance criteria
- Fresh install runs all migrations; relaunch does not re-run them.
- Broken migration shows error screen and leaves DB untouched.
- Signing in as user B never shows user A's notes (separate DB files + server scoping).
- 10,000 notes list scrolls smoothly (virtualization proven by DOM node count < 100).
- Offline (API unreachable): cached notes still visible; mutations show a clear error.
- Tests, lint, typecheck green.

## Out of scope
Two-way sync, conflict resolution, encryption at rest (log in Backlog).

## Verification commands
```
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter api test
```

## Review checklist
- [ ] No SQL string concatenation.
- [ ] Per-user isolation, server-side authorization check on every notes route.
- [ ] Query keys centralized; invalidation correct.
- [ ] Notes feature deletable without breaking build (feature isolation).

## Agent report
_(agent fills)_

## Review
_(reviewer fills)_
