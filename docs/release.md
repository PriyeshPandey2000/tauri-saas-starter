# Release guide

Releases are built only by `.github/workflows/release.yml` on tags `v*`.
The release is a **draft**; a human publishes it after checking assets.

## Local preparation

```bash
pnpm install --frozen-lockfile
pnpm run version:check
pnpm run verify:prerelease
pnpm run lint && pnpm run typecheck && pnpm run test
pnpm --filter desktop test:e2e
pnpm run perf:check
```

Bump versions with the single-source script (package.json, Cargo.toml and
tauri.conf.json):

```bash
node scripts/version.mjs suggest          # feat → minor, fix → patch, ! → major
node scripts/version.mjs bump 0.2.0
```

Then commit, tag `v0.2.0`, and push the tag. Release notes come from
`scripts/changelog.mjs` (Conventional Commits, grouped by type).

## GitHub repository settings (manual)

### Variables (Settings → Secrets and variables → Actions → Variables)

| Name                         | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `VITE_API_URL`               | Production API origin baked into the desktop build. |
| `VITE_UPDATER_ENDPOINT`      | Stable `latest.json` feed URL (index 0).            |
| `VITE_UPDATER_ENDPOINT_BETA` | Beta `latest.json` feed URL (index 1).              |
| `TAURI_UPDATER_PUBLIC_KEY`   | Public updater key (never the private key).         |

### Secrets

| Name                                 | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `TAURI_SIGNING_PRIVATE_KEY`          | Updater private key content/path (CI only).            |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Updater key password, if any.                          |
| `APPLE_CERTIFICATE`                  | Base64 Developer ID Application `.p12`.                |
| `APPLE_CERTIFICATE_PASSWORD`         | Password for the `.p12`.                               |
| `APPLE_SIGNING_IDENTITY`             | e.g. `Developer ID Application: Name (TEAMID)`.        |
| `APPLE_ID`                           | Apple ID for notarization.                             |
| `APPLE_PASSWORD`                     | App-specific password for notarization.                |
| `APPLE_TEAM_ID`                      | Apple team id.                                         |
| `WINDOWS_CERTIFICATE`                | Base64 PFX for Azure Trusted Signing or a certificate. |
| `WINDOWS_CERTIFICATE_PASSWORD`       | PFX password.                                          |

For Azure Trusted Signing, create the account/certificate in Azure and provide
the values Tauri expects; the placeholder names above are enough for a
certificate-based flow. Never put any of these in the repo.

The build passes unsigned when the signing secrets are absent. macOS signing and
notarization are performed by `tauri-action` when the Apple secrets exist;
Windows signing likewise. Reference: <https://v2.tauri.app/distribute/sign/macos/>
and <https://v2.tauri.app/distribute/sign/windows/>.

### Updater key pair (once per app)

```bash
pnpm tauri signer generate -w ~/.tauri/desktop-saas-starter.key
```

Put the private key content in `TAURI_SIGNING_PRIVATE_KEY` (secret) and the
public key in `TAURI_UPDATER_PUBLIC_KEY` (variable). Keep a backup offline: if
it is lost, existing users cannot receive updates. References:
<https://v2.tauri.app/plugin/updater/> and
<https://v2.tauri.app/plugin/updater/#signing-updates>.

### Feeds and channels

`tauri-action` uploads updater artifacts, signatures and `latest.json` when
`includeUpdaterJson: true`. Point the stable variable at the stable release
asset and the beta variable at the beta (pre-release tag) asset. The desktop
selects index 0 for stable and index 1 for beta; beta is only offered when the
`betaUpdates` flag is on and the setting asks for it.

### Branch protection (required checks)

Protect `main` and require these CI jobs:

- `architecture`
- `security`
- `commitlint` (pull requests)
- `test`
- `rust`
- `e2e`
- `smoke (macos-latest)`
- `smoke (windows-latest)`

Also require a review and up-to-date branches. CI uses least-privilege
permissions, no `pull_request_target`, and fork PRs receive no secrets.

## First release checklist

1. Rotate/confirm the updater key and store both parts (private in Actions,
   public in the variable).
2. Set the production API URL and feed variables.
3. Add signing secrets if shipping signed builds; otherwise expect a warning and
   unsigned artifacts.
4. Run the local gates above.
5. Bump the version, commit, tag `vX.Y.Z`, push the tag.
6. Wait for the draft release; check macOS and Windows assets, `.sig` files and
   `latest.json`.
7. Install the draft artifacts, run the app, and confirm the updater sees the
   next version.
8. Publish the draft manually.

Manual register rows: M9-01 to M9-10 in `docs/deferred-checks.md`.
