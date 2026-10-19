# M9: Quality, Performance & Release

**Goal:** Automated confidence, enforced perf budgets, signed releases.
**Prereqs:** M8 PASS.

## Tasks
- [ ] 9.1 CI workflow `ci.yml` on PR: install (cached), lint, typecheck, unit tests (JS + Rust), build api. Fail on any warning-level eslint error.
- [ ] 9.2 E2E: Playwright against the web build of the frontend with mocked ports (and WebKit + Chromium projects). Cover: sign-in flow, notes CRUD, flag-gated route, entitlement gate, consent prompt. Mock Tauri IPC via a test shim.
- [ ] 9.3 Tauri smoke test: launch built app in CI (mac + Windows runners) and assert it starts and exits cleanly within 15s (use `--smoke-test` flag that boots, renders root, exits 0).
- [ ] 9.4 Perf budgets script `scripts/perf-check.ts`: measures JS gzip size (from build output), installer size, and in smoke test records time-to-interactive. Compare with `perf-budgets.json` (PRD rule 9). CI fails on regression > 10% or budget breach. Output a summary table to the job log.
- [ ] 9.5 Bundle analysis: `pnpm analyze` using rollup-plugin-visualizer; commit nothing generated.
- [ ] 9.6 Release workflow `release.yml` on tag `v*`: matrix mac (universal) + Windows, uses `tauri-action`, builds, signs, notarizes (mac), signs (Windows), generates updater artifacts + `latest.json`, uploads to GitHub Releases as draft.
- [ ] 9.7 Signing docs `docs/release.md`: Apple Developer ID + notarization secrets, Windows signing option (Azure Trusted Signing or cert), updater key, list of required GitHub secrets with names. No real secrets in repo.
- [ ] 9.8 Dependency hygiene: Renovate or Dependabot config, `cargo audit` and `pnpm audit --prod` in CI (non-blocking warn for low severity, blocking for high).
- [ ] 9.9 Security checks in CI: grep guard for `invoke(` outside bindings, vendor imports outside adapters, `localStorage` in auth/billing, `eval(`.
- [ ] 9.10 Versioning: single source of truth version synced between `package.json`, `Cargo.toml`, `tauri.conf.json` by a `scripts/bump-version.ts`. Changelog from conventional commit-style messages (`M<n>.<task>` prefix is fine for now; just document).

- [ ] 9.11 **Architecture gate in CI.** Run `pnpm lint:arch` and the vendor-import check as a separate required CI job named `architecture`. Add a dependency-cycle check (`madge --circular` or dependency-cruiser) that fails on cycles. Add a test that every folder in `features/` exposes an `index.ts` and that no file outside `app/`/`routes/` imports a feature's deep path.
- [ ] 9.12 Dependency freshness: weekly CI job (or Renovate) that reports outdated deps. Pre-release versions are rejected by a script scanning lockfiles.

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
_(agent fills)_

## Review
_(reviewer fills)_
