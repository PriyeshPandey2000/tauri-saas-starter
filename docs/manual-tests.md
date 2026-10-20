# Manual native checks (M8)

Run on a **built** app (`pnpm tauri build` through `apps/desktop/scripts/tauri.mjs`
so the CSP and updater config are generated). Fill in the actual result.

## Tray and close-to-tray

1. Launch the app; confirm the tray icon and menu (Open, Check for updates, Quit).
2. With **Close to tray off**, closing the window quits the app.
3. Enable **Close to tray** in Settings, close the window: the process stays in
   the tray; Open restores and focuses it; Quit exits.
4. macOS: hiding to the tray removes the dock icon; reopening restores it.

## Global shortcut

1. Default `CommandOrControl+Shift+Space` hides/shows the window.
2. Change it in Settings and confirm the new accelerator works.
3. Set an accelerator already used by another app: a toast explains the conflict
   and the app stays usable.
4. Clear the field: the shortcut is unregistered.

## Single instance

1. Open the app, then launch a second copy (Finder/open -n or the exe).
2. No second window appears; the first window is focused.
3. `open "tauri-saas-starter://billing/success"` while the app is running only
   refetches the entitlement (no navigation, no commands).

## Deep links (cold and warm)

1. Cold: quit the app, `open "tauri-saas-starter://billing/success"`; the app
   launches and refetches the entitlement.
2. Warm: with the app running, repeat; same behavior, no second instance.
3. Unknown link (`tauri-saas-starter://admin/run` or another scheme) is ignored
   and logged; no navigation or command runs.

## Notifications

1. Enable notifications in Settings; macOS asks for permission.
2. Confirm a notification appears after granting; denying leaves the app usable.

## Launch at login

1. Off by default. Enable, log out/in, confirm the app starts.
2. Disable and confirm it no longer starts.

## Updates

1. Generate keys (once, not in this repo):
   `pnpm tauri signer generate -w ~/.tauri/app.key`.
2. Put the public key in `TAURI_UPDATER_PUBLIC_KEY`; set
   `VITE_UPDATER_ENDPOINT` to a `latest.json` feed (GitHub Releases or R2).
3. Build N, then publish N+1 with `.sig` files and a `latest.json`; start N.
4. About 10 s after first paint, a non-blocking toast offers the update.
5. Download shows progress; "Restart to update" relaunches into N+1.
6. Break the feed or signature: the app keeps running and reports the error.
7. Beta channel only appears when the `betaUpdates` flag is on.

Never commit or log the private key; CI uses `TAURI_SIGNING_PRIVATE_KEY` as a
secret (M9).
