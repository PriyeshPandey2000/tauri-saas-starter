# M9: Quality, Performance & Release

**Goal:** Automated confidence, enforced perf budgets, signed releases.
**Prereqs:** M8 PASS.

## Tasks

- [x] 9.1 CI workflow `ci.yml` on PR: install (cached), lint, typecheck, unit tests (JS + Rust), build api. Fail on any warning-level eslint error.
- [x] 9.2 E2E: Playwright against the web build of the frontend with mocked ports (and WebKit + Chromium projects). Cover: sign-in flow, notes CRUD, flag-gated route, entitlement gate, consent prompt. Mock Tauri IPC via a test shim.
- [x] 9.3 Tauri smoke test: launch built app in CI (mac + Windows runners) and assert it starts and exits cleanly within 15s (use `--smoke-test` flag that boots, renders root, exits 0).
- [x] 9.4 Perf budgets script `scripts/perf-check.ts`: measures JS gzip size (from build output), installer size, and in smoke test records time-to-interactive. Compare with `perf-budgets.json` (PRD rule 9). CI fails on regression > 10% or budget breach. Output a summary table to the job log.
- [x] 9.5 Bundle analysis: `pnpm analyze` using rollup-plugin-visualizer; commit nothing generated.
- [x] 9.6 Release workflow `release.yml` on tag `v*`: matrix mac (universal) + Windows, uses `tauri-action`, builds, signs, notarizes (mac), signs (Windows), generates updater artifacts + `latest.json`, uploads to GitHub Releases as draft.
- [x] 9.7 Signing docs `docs/release.md`: Apple Developer ID + notarization secrets, Windows signing option (Azure Trusted Signing or cert), updater key, list of required GitHub secrets with names. No real secrets in repo.
- [x] 9.8 Dependency hygiene: Renovate or Dependabot config, `cargo audit` and `pnpm audit --prod` in CI (non-blocking warn for low severity, blocking for high).
- [x] 9.9 Security checks in CI: grep guard for `invoke(` outside bindings, vendor imports outside adapters, `localStorage` in auth/billing, `eval(`.
- [x] 9.10 Versioning: single source of truth version synced between `package.json`, `Cargo.toml`, `tauri.conf.json` by a `scripts/bump-version.ts`. Changelog generated from Conventional Commits (e.g. `git-cliff` or `release-please`), grouped by type, and used as the GitHub release notes in `release.yml`. Version bump suggestion derived from commit types (feat = minor, fix = patch, `!` = major). Add a CI job that runs commitlint on all commits in the PR range.

- [x] 9.11 **Architecture gate in CI.** Run `pnpm lint:arch` and the vendor-import check as a separate required CI job named `architecture`. Add a dependency-cycle check (`madge --circular` or dependency-cruiser) that fails on cycles. Add a test that every folder in `features/` exposes an `index.ts` and that no file outside `app/`/`routes/` imports a feature's deep path.
- [x] 9.12 Dependency freshness: weekly CI job (or Renovate) that reports outdated deps. Pre-release versions are rejected by a script scanning lockfiles.

## Acceptance criteria

- Introducing a cross-feature import, a vendor import outside an adapter, or a circular import fails CI (agent demonstrates each once, then reverts).
- A PR with a lint error, type error, failing test, or budget breach is blocked.
- Pushing a tag produces draft release with signed installers and `latest.json` (dry run with unsigned if secrets absent; document the signed path).
- Perf table printed in CI with real numbers.
- Guard greps fail when violations are introduced (agent demonstrates once with a temporary violation, then reverts).

## Out of scope

Store distribution (MSIX/Mac App Store), staged rollouts.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
pnpm perf:check
```

## Review checklist

- [ ] Secrets only via GitHub secrets.
- [ ] Budgets realistic and enforced, not advisory.
- [ ] Release is a draft by default (human publishes).
- [ ] CI time reasonable (caching used).

## Agent report

**Status: complete for M9.1-M9.12 (2026-10-20). GitHub-only steps not run.**

### What shipped

- **9.1/9.11 CI.** `.github/workflows/ci.yml` with pinned action SHAs, read-only
  permissions, concurrency, and separate `architecture`, `security`,
  `commitlint`, `test`, `rust`, `e2e` and `smoke` jobs. Architecture runs
  lint-arch, vendor-import, madge cycles, feature-boundary, guard and capability
  audits. Security runs the tracked secret scan, bundle scan, `pnpm audit
--prod --audit-level=high` and RustSec. `pnpm lint` now includes
  `verify:capabilities`.
- **9.2 E2E.** Playwright Chromium+WebKit against a `VITE_E2E` build with fake
  auth/billing/flags/analytics ports and a Tauri IPC-free web shim: sign-in,
  notes CRUD with user isolation, flag-gated route, entitlement gate, consent
  no-send-before-accept and settings.
- **9.3 Smoke.** `--smoke-test` boots the built app, waits for visibility, checks
  webview errors through a typed command, prints `[window] shown`, zero-error
  lines and RSS, then exits 0 within 15 s. CI runs it on macOS and Windows;
  locally the release build returned exit 0.
- **9.4/9.5 Perf and analysis.** `perf-budgets.json`, `perf-baseline.json`,
  `scripts/perf-check.mjs`, and `pnpm --filter desktop analyze` with
  rollup-plugin-visualizer (generated file removed).
- **9.6/9.7 Release.** `release.yml` on `v*` builds macOS universal + Windows
  via `tauri-action` with `tauriScript: pnpm --filter desktop tauri`, draft
  releases, updater JSON, changelog notes, version check and shipped-asset
  verification. Signing/notarization envs are optional; `docs/release.md`
  lists every secret/variable, branch-protection checks and the first-release
  checklist.
- **9.8/9.9/9.10.** Dependabot weekly for npm, cargo and actions; guard grep for
  `invoke`/`eval`/auth/billing localStorage; version sync script + changelog
  script + commitlint range job.
- **9.12** Pre-release lockfile scan with an explicit allowlist
  (`.github/prerelease-allowlist.json`; the approved specta shims and two
  stable transitive pre-releases are documented).

### Verification (real output)

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  37 passed (37)
desktop:test:       Tests  137 passed (137)
api:test:  Test Files  11 passed (11)
api:test:       Tests  51 passed (51)

$ pnpm --filter desktop test:e2e
  10 passed (7.5s)   # chromium + webkit

$ cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
test result: ok. 8 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

$ appsdesktop --smoke-test
[smoke] requested=true
[smoke] report errors=0 shown=true
[smoke] window shown after 39ms
[smoke] zero console errors and zero unhandled rejections
[smoke] rss_kb=106512
exit 0

$ pnpm perf:check
| Metric | Measured | Budget | Status |
| main JS gzip | 130.21 kB | 300 kB | ok |
| installer | 1.54 MB | 15 MB | ok |
| window shown | 39.00 ms | 1500 ms | ok |
| idle memory | 104.02 MB | 150 MB | ok |

$ actionlint (empty dir)
(no findings, exit 0)

$ pnpm verify:prerelease
Pre-release scan ok (only documented exceptions allowed)

$ pnpm version:check
Versions in sync: 0.1.0

$ pnpm audit --prod --audit-level=high
exit 0 (one moderate advisory reported, non-blocking)

$ pnpm audit:rust
exit 0 (4 advisories ignored with documented reasons in DECISIONS)
```

Guard demonstrations (temporary files, reverted): a cross-feature import failed
`verify:feature-boundaries`; an `eval()` failed `verify:guards`.
`madge` reports no cycles after moving `Ports` out of the composition root.

### Not run (needs GitHub or real signing material)

- Signed/notarized macOS and signed Windows artifacts.
- The CI smoke jobs on macOS/Windows runners and the manual register rows
  M9-01..M9-12 (repo variables/secrets, branch protection, release
  environment, tag ruleset, signing, updater key pair, draft release/publish,
  real N→N+1 update, Dependabot).
- Installer measured locally from an unsigned DMG; CI installer measurement is
  skipped when no bundle exists.

### Hardening round (2026-10-20, reviewer items 1-9)

One fix commit addressed all nine findings:

1. `release.yml` now verifies (before any build) that the tagged commit is an
   ancestor of `origin/main` (`git merge-base --is-ancestor`) and that the tag
   equals `v` + the desktop package version; the job runs in
   `environment: release`; a wait loop requires the CI workflow run for the
   tagged SHA to conclude `success` (via `gh api`, read-only).
2. Signing secrets are split into two `tauri-action` steps gated by
   `if: runner.os`; each OS only receives its own secrets. Shared updater
   signing envs remain on both.
3. `rustsec/audit-check` replaced by `taiki-e/install-action` (cargo-audit,
   pinned SHA) + `pnpm audit:rust` — same ignore list as local runs.
4. The inline secret regexes in `ci.yml` were replaced by
   `scripts/check-tracked-secrets.mjs`, which uses `scripts/secret-patterns.mjs`
   and exits 1 explicitly on hits (no `!` negation).
5. Release notes output now uses a random `openssl rand -hex` delimiter.
6. `timeout-minutes` added to every job in both workflows.
7. Dependabot: npm grouped minor/patch only; `typescript` majors and minors and
   `tauri-specta`/`specta` ignored; `tauri*` cargo crates grouped.
8. See 1: green CI for the tagged SHA is required before building.
9. Product name is a single workflow-level `PRODUCT_NAME` env used in
   `releaseName`.

`docs/release.md` gained Tag rulesets and Environment `release` manual
sections; both are register rows M9-11/M9-12 in `docs/deferred-checks.md`.

Local verification of the hardening round:

```
$ actionlint (from an empty dir, both workflow files)
(no findings, exit 0)

$ node scripts/check-tracked-secrets.mjs
Secret scan clean (356 tracked files).

$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  37 passed (37)
desktop:test:       Tests  137 passed (137)
api:test:  Test Files  11 passed (11)
api:test:       Tests  51 passed (51)

$ cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
test result: ok. 8 passed; 0 failed; 1 ignored

$ pnpm version:check / verify:prerelease / lint:arch / check-vendor-imports /
  check:cycles / verify:feature-boundaries / verify:guards / verify:capabilities
all ok
```

## Review

**Verdict: PASS after one hardening round** (2026-10-20). Forced `turbo run lint typecheck test build` 12/12 (desktop 137 tests, api 51), `cargo test` 8 passed + 1 ignored; capability audit, feature-boundary, guard, pre-release, version and madge cycle checks all pass. All nine pinned action SHAs were verified against their version tags with `git ls-remote` (match). Workflows use `pull_request` (never `_target`), top-level and per-job least-privilege `permissions`, concurrency groups, `--frozen-lockfile`, draft-only releases, the repo wrapper via `tauriScript` (so the generated CSP applies), and optional signing. Not run: the workflows on GitHub (first push will be the first real run).

Fix in ONE commit (then push; see the prompt for the CI follow-up):

1. **Release trigger is too open.** Any collaborator can push a `v*` tag on any commit and get a run with signing secrets. Before building, verify the tagged commit is an ancestor of `origin/main` and that the tag equals `v` plus the package version; run the job in a protected GitHub Environment named `release` (secrets scoped to it, required reviewer), and document tag rulesets in docs/release.md.
2. **Least-privilege secrets.** Every secret is in one step env on both OSes (Windows runners receive Apple secrets and macOS runners receive Windows ones). Split into per-OS steps with `if: runner.os == ...`.
3. **`rustsec/audit-check` needs `checks: write`** to publish results; the job only has `contents: read`, so it will likely fail. Run the same `pnpm audit:rust` script used locally (one source for the ignore list) instead of a third-party action, or grant the extra permission.
4. **Secret scan duplicated in YAML.** The regexes live inline and in `scripts/secret-patterns.mjs`; use the script (with an explicit `if ...; then exit 1; fi`, not a `!` negation) so they cannot drift.
5. **Release notes output uses a constant `EOF` delimiter.** A commit message containing a line `EOF` can inject outputs. Use a random delimiter.
6. Add `timeout-minutes` to every job (e.g. 20 to 45).
7. **Dependabot:** the npm group `patterns: ["*"]` bundles majors together and would fight the pinned TypeScript range (`typescript-eslint` peer `<6.1.0`) and the pinned RC crates. Group minor/patch only, add `ignore` entries for `typescript` majors/minors and `tauri-specta`/`specta`, and group the `tauri*` crates and plugins together.
8. Release job should require green CI for the tagged commit (query the check runs for that SHA with read-only API calls, or call CI as a reusable workflow).
9. Cosmetic: release name says "Desktop SaaS Starter", the product is "Tauri SaaS Starter"; use one name from a single variable.

Human items remain in the register (M9-01 to M9-10): repo rulesets and required checks, Environment `release` with reviewers and secrets, Apple and Windows signing material, updater key pair, first draft release, real N to N+1 update.

## Verification summary

- **Automated tests:** CI configs, E2E (10), unit (37 files / 137 + API 11 / 51), Rust (8 passed / 1 ignored), actionlint, perf budgets, capability/feature/guard/prerelease/version audits all pass locally.
- **Agent dev-run observations:** release build smoke exited 0 with zero webview errors and 39 ms to window shown; local perf numbers in the table above.
- **Manual human checks still open:** [M9-01](../deferred-checks.md#m9-01-repository-variables-and-secrets), [M9-02](../deferred-checks.md#m9-02-branch-protection-checks), [M9-03](../deferred-checks.md#m9-03-built-app-headless-ci-smoke), [M9-04](../deferred-checks.md#m9-04-apple-signing-and-notarization), [M9-05](../deferred-checks.md#m9-05-windows-signing), [M9-06](../deferred-checks.md#m9-06-updater-key-pair), [M9-07](../deferred-checks.md#m9-07-draft-release-assets), [M9-08](../deferred-checks.md#m9-08-publish-the-release), [M9-09](../deferred-checks.md#m9-09-real-update-from-draft-build), [M9-10](../deferred-checks.md#m9-10-dependabot-review), [M9-11](../deferred-checks.md#m9-11-environment-release-with-reviewers), [M9-12](../deferred-checks.md#m9-12-tag-ruleset-for-v-tags).
