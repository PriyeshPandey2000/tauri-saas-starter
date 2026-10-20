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
certificate-based flow. Store them as **environment secrets** of the `release`
environment (see below), never in the repo. Each OS step only receives its own
OS's secrets.

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

Protect `main` and require these CI jobs (manual step M9-02):

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

### Tag rulesets (manual step M9-12)

Settings → Rules → Rulesets → New ruleset, targeting tags `v*`:

- Restrict creations and deletions to maintainers (or the release manager).
- Block force pushes and deletions of existing tags.
- The release workflow additionally verifies that the tagged commit is an
  ancestor of `origin/main` and that the tag equals `v` plus the package
  version, so a tag on any other commit fails before building.

### Environment `release` (manual step M9-11)

Settings → Environments → New environment, name it `release`:

- Add required reviewers (at least one human).
- Limit deployment branches to tags `v*`.
- Put the release-scoped secrets there instead of repository secrets:
  `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`,
  `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
  `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERTIFICATE`,
  `WINDOWS_CERTIFICATE_PASSWORD`. The workflow runs with
  `environment: release`, so those secrets are only available to tag builds
  that pass the tag checks and wait for reviewer approval.
- The `VITE_*` and `TAURI_UPDATER_PUBLIC_KEY` values can stay repository
  variables; they are not secret.

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

Manual register rows: M9-01 to M9-12 in `docs/deferred-checks.md`.
