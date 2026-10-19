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
