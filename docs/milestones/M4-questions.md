# M4 questions

**Resolved 2026-10-20:** every default below was implemented as written; no answer
was needed. See the M4 deviations in `docs/DECISIONS.md`.

## Q1 (blocking unless default accepted, PRD rule 13) — SQL port name collides with the existing KV `StoragePort`

M4.4 says: "`ports/StoragePort` real adapter `SqliteStorage`: `query<T>(sql, params)`,
`execute(sql, params)`, `transaction(fn)`." But `apps/desktop/src/ports/StoragePort.ts`
already exists and is a **key/value** port (`get`/`set`/`remove`/`clear`) used by the
settings feature, the memory adapter, and `Ports.storage`.

Putting SQL methods on that same interface would break the KV consumers and mix two
unrelated responsibilities.

**Default I will assume unless you say otherwise:** add a new `ports/DatabasePort.ts`
(SQL-shaped: `query`, `execute`, `transaction`) with a `SqliteDatabase` adapter, and
leave the KV `StoragePort` untouched. Logged in `docs/DECISIONS.md`.

## Q2 (non-blocking, default assumed) — notes data source: local-first, remote as alternate

The acceptance criteria imply both a local SQLite store and the remote `/notes` API
exist, and that offline still shows cached notes. I will implement a single
`NotesRepository` interface with `LocalNotesRepository` (SQLite, default and the one
the UI uses) and `RemoteNotesRepository` (`NotesApi` over `apiClient`). The concrete
adapter is chosen in one file (`features/notes/repository.ts`), so swapping is one edit.
Say so if you want the UI on the remote repository instead.

## Q3 (non-blocking, default assumed) — query persistence store

M4.8 allows "plugin-store or SQLite". `tauri-plugin-store` is already a dependency and
is the smaller change, so I will persist the query cache there (not in SQLite), exclude
auth-sensitive keys, and clear on sign-out.
