# Deferred manual checks

Checks that need a human, a display, or real credentials. They do not block a
milestone; run the ones whose milestone you are on, and add new entries here in
later milestones. Each entry names the milestone that depends on it.

## Google OAuth round-trip (M3, M4)

Needs a Google client ID/secret, a Google Cloud OAuth client with redirect URI
`http://localhost:8787/api/auth/callback/google`, and a **built macOS app**: deep
links do not work under `tauri dev`.

1. Put `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `apps/api/.env`, run
   `pnpm db:up`, `pnpm --filter api db:migrate`, `pnpm --filter api dev`.
2. Build the app: `pnpm --filter desktop tauri build` then open the bundled app from
   `/Applications`.
3. Sign in with Google in the app, confirm the browser opens, and confirm the
   callback returns to the app signed in.
4. Sign in a second time with the same account to confirm account linking, and once
   with a different provider to confirm the linking policy.

## Windows webview origin (M3)

Windows webviews use `http://tauri.localhost` instead of `tauri://localhost`.

1. On Windows, run the app against the API, sign in, and make one authenticated
   `/api/me` call.
2. Confirm CORS allows the origin and no preflight fails.

## Real keychain round-trip (M3)

Exercises the OS keychain instead of the test double.

1. `cd apps/desktop/src-tauri && cargo test -- --ignored keychain_roundtrip`
2. Confirm the value is written, read back, and removed.

## M1 manual UI checks (M1)

1. Launch the app, confirm the window size, theme switching, and the native menu.
2. `screencapture` checks are blocked until the terminal has Screen Recording
   permission (System Settings > Privacy & Security > Screen Recording).

## 2 MB log rotation (M1, M10)

The file logger rotates at 2 MB.

1. Run the app and drive enough logging to exceed 2 MB, or lower the cap
   temporarily.
2. Confirm a rotated file appears and the active log stays under the cap.

## Compose Postgres port clash (M3, M4)

A native Postgres listening on `127.0.0.1:5432` shadows the compose container's
published port, so `localhost:5432` reaches the wrong server.

1. Free 5432, or change the host side of the port mapping in `docker-compose.yml`
   to `"5433:5432"` and use `postgres://app:app@localhost:5433/app`.

## Local database and notes UX (M4)

These need a built/running app (the Tauri plugin cannot run under Node).

1. Sign in as two different users and confirm each gets its own
   `app-<userId>.db` under the app data dir (`~/Library/Application Support/<id>/`
   on macOS) and never sees the other user's notes.
2. Relaunch: migrations must not re-run (check `_migrations`) and the last notes
   are visible immediately from the persisted query cache.
3. Create ~10,000 notes and scroll: virtualization keeps the DOM node count under
   100 and scrolling stays smooth.
4. Stop the API (or disconnect): cached notes still render, and a mutation shows a
   clear error rather than a silent failure.
5. Sign out and back in: the local database closes and reopens; the persisted query
   cache is cleared on sign-out.

## M4 review checks (M4)

1. Scroll 10,000 notes and confirm it stays smooth (automated DOM-node count is the proxy; feel needs a real app).
2. Sign in as two accounts on one machine and confirm separate `app-<sha256>.db` files and no shared notes.
3. Force a migration failure (e.g. corrupt `0002_notes_created_at.sql` in a dev build) and confirm the notes error screen offers Retry and Sign out, and that Account/Settings stay reachable.
4. Lose the session through a 401 (revoke it server-side) and confirm the next sign-in as another user shows none of the previous user's notes.
