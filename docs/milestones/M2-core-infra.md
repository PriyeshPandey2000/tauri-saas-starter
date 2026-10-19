# M2: Core Infrastructure

**Goal:** Foundations every feature depends on: config, logging, ports, typed IPC, secure storage.
**Prereqs:** M1 PASS.

## Tasks

- [x] 2.1 Env/config: `shared/lib/config.ts` parses `import.meta.env` with a Zod schema (`VITE_API_URL`, `VITE_APP_ENV` = dev|staging|prod, plus optional vendor keys). App fails fast with a readable error screen if invalid. Provide `.env.example`. Environments: dev, staging, prod.
- [x] 2.2 Typed IPC: add `tauri-specta` (+ `specta`), generate `src/shared/ipc/bindings.ts` from Rust commands. Add npm script `gen:bindings` and run it in dev build. Add a sample command `get_app_info` (version, os, arch) and use it in the settings page footer.
- [x] 2.3 Secure storage (Rust): commands `secure_set(key, value)`, `secure_get(key)`, `secure_delete(key)` using the `keyring` crate (OS keychain). Service name from app identifier. Values never logged. TS wrapper `shared/lib/secureStorage.ts` using generated bindings.
- [x] 2.4 Logger port: `ports/LoggerPort.ts` (`debug|info|warn|error(msg, ctx?)`). Adapter `ConsoleLogger` for dev. Adapter writing to file through `tauri-plugin-log` (rotation: 5 files x 2MB, in app log dir). Redact keys named `token`, `password`, `authorization`, `secret`. Wire global error handlers from M1.9 to the logger.
- [x] 2.5 Define port interfaces ONLY (no vendor code yet), each in `src/ports/`: `AuthPort`, `BillingPort`, `FeatureFlagPort`, `AnalyticsPort`, `ErrorReporterPort`, `StoragePort`. Keep them small and promise-based. Add JSDoc per method.
- [x] 2.6 Provide no-op/in-memory adapters for each port in `ports/adapters/noop/`. A `ports/index.ts` composition root picks adapters by config, exposes them via React context (`usePorts()`).
- [x] 2.7 API client: `shared/lib/apiClient.ts` using `fetch`. Base URL from config, JSON in/out, Zod-validated responses via helper `request(schema, opts)`, typed `ApiError`, timeout (15s) using AbortController, auth header injected from a pluggable token provider (set in M3). Use Tauri http plugin only if CSP/CORS requires it; document the choice in DECISIONS.md.
- [x] 2.8 Rust: central `AppError` enum implementing `serde::Serialize`; commands return `Result<T, AppError>`. Generated types reflect it.
- [x] 2.9 Tauri capabilities: add only permissions used so far (store, log, window-state, keyring commands). Document each permission in a comment.
- [x] 2.10 Unit tests: config parsing (valid/invalid), logger redaction, apiClient error mapping + timeout (mock fetch). Rust test for AppError serialization.

## Acceptance criteria

- Missing/invalid env shows config error screen, not a crash.
- `bindings.ts` is generated, committed, and no raw `invoke(` exists outside it (grep proves it).
- Secure set/get/delete round-trips through the real keychain (manual check on mac or Windows; note which).
- Log file created and rotated; a logged `{token:"abc"}` shows `[REDACTED]`.
- Every port has an interface and a noop adapter; `usePorts()` works in a component.
- Tests, lint, typecheck green.

## Out of scope

Real vendor adapters, auth flows, DB.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
grep -rn "invoke(" apps/desktop/src | grep -v bindings.ts   # must be empty
```

## Review checklist

- [ ] Ports are vendor-neutral (no vendor types leak into interfaces).
- [ ] No token ever written to logs or localStorage.
- [ ] Capabilities minimal and commented.
- [ ] Errors are typed end-to-end.

## Agent report

Implemented in this order: 2.1, 2.2, 2.8, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 2.10.
2.8 moved ahead of 2.3 because the secure-storage commands need `AppError`.

Commits (one per task, `Refs: M2.n`):

- `6294fa1` M2.1 env config: Zod schema over `import.meta.env`, `ConfigError`
  screen shown before the shell renders, `.env.example` plus a non-secret
  `.env.development`.
- `4670e96` M2.2 typed IPC: `tauri-specta`/`specta` pinned `=2.0.0-rc.25`,
  `specta-typescript =0.0.12`, bindings exported from a debug build at startup and
  by `pnpm gen:bindings`; `get_app_info` shown in the settings footer. The
  generated file is excluded from prettier and eslint so it stays byte-identical
  to a fresh export.
- `b6623fa` M2.8 `AppError` (`{kind, message}` tagged union) exported to bindings,
  with Rust serialization tests.
- `ce95348` M2.3 keychain commands: `keyring` 4.2.0 on `spawn_blocking`, app
  identifier as service, `NoEntry` mapped to `null`/no-op, Zod-checked TS wrapper.
- `222691c` M2.4 logger: `LoggerPort`, console and rotating file adapters
  (`KeepSome(5)`, 2MB), recursive redaction of token/password/authorization/secret,
  global handlers wired.
- `72ba54a` M2.5 six promise-based port interfaces with JSDoc.
- `6b9b706` M2.6 no-op/in-memory adapters, `createPorts()`, `PortsProvider`,
  `usePorts()`; error boundary and theme sync consume the ports.
- `9a25c4e` M2.7 fetch API client: Zod responses, `ApiError` (http/network/
  timeout/invalid_response), 15s AbortController timeout, pluggable token provider.
  Plain `fetch` choice logged in DECISIONS.
- `9e9c2cf` M2.9 every capability entry commented.
- M2.10 tests live in their task commits: config (5), redaction (5), apiClient (6),
  ports context/noops (3), Rust `AppError` (2).

### Round 2 fixes (review items 1-6)

- `1ad07e0` M2.11 ignored `keychain_roundtrip` test: unique throwaway service,
  set/get/delete/delete-again, cleanup on every path. `keyring` 4's `v1` feature
  initializes the native store lazily on first `Entry::new`, so no explicit default
  store is needed. Not run by the agent (user runs it).
- `c767c2e` M2.12 file adapter catches every plugin rejection and falls back to a
  raw `console` call; tested for the success and rejection paths (no loop).
- `834bb21` M2.13 optional `VITE_LOG_TARGET` (`console`|`file`) in the config schema
  and `.env.example`; explicit value wins, else console in dev and file elsewhere.
- `f4b8a4c` M2.14 bindings path built from `env!("CARGO_MANIFEST_DIR")`; a failed
  debug export warns instead of panicking.
- `9c96048` M2.15 a 2xx body that is not JSON maps to `invalid_response`; tested.
- `d6c9a1d` M2.16 secure-storage wrapper tests: ok, missing key, AppError kind,
  delete.

### Verification output (2026-10-19, after round 2)

`pnpm lint && pnpm typecheck && pnpm test`:

```
check-vendor-imports: OK (no vendor SDK imports outside ports/adapters)
typecheck: 3 successful, 3 total
desktop:test: Test Files 13 passed (13)
desktop:test:      Tests 47 passed (47)
api:test:     Test Files 1 passed (1)
api:test:          Tests 1 passed (1)
```

`pnpm --filter desktop build`:

```
dist/assets/index-*.js  533.92 kB (gzip 167.70 kB)
✓ built in 602ms
```

`cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`:

```
test commands::secure_storage::tests::keychain_roundtrip ... ignored, writes to the real OS keychain; run manually
test error::tests::serializes_every_variant_with_the_same_shape ... ok
test error::tests::serializes_with_kind_and_message ... ok
test tests::export_bindings ... ok
test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
```

`grep -rn "invoke(" apps/desktop/src | grep -v bindings.ts`:

```
(no output; exit 1)
```

### Runtime evidence (2026-10-19, `pnpm --filter desktop tauri dev`)

```
VITE v8.3.4 ready in 504 ms
Local: http://localhost:1420/
Running target/debug/appsdesktop
```

- The debug startup export rewrote `bindings.ts` with no git diff, so the
  committed bindings match a fresh export.
- `VITE_LOG_TARGET=file pnpm --filter desktop tauri dev` selected the file adapter.
  The log then contained the frontend lines, e.g.
  `[INFO] theme.changed {"theme":"dark"}` from
  `src/ports/adapters/file-logger.ts`, with no secret material.
- `~/Library/Logs/com.example.tauri-saas-starter/app.log` was created and received
  the Rust plugin's trace lines (plugin-log UTC timestamps).
- A keychain round-trip and a 2MB rotation were not run.

### Not run

- Keychain round-trip (user): `cargo test --manifest-path
apps/desktop/src-tauri/Cargo.toml -- --ignored keychain_roundtrip`.
- Log rotation (needs 2MB of entries).
- Interactive theme change in the window (no display); the mount-time
  `theme.changed` line above proves the file path.
- Installer build (`tauri build`).

### Notes for review

- Generated `bindings.ts` contains one `any` in tauri-specta's own contract
  assertion (`Promise<any>`). It is machine-generated and excluded from lint; no
  hand-written code uses `any`.
- `usePorts()` is exercised by `WindowThemeSync` (logs theme changes) and the ports
  test renders a probe component.

## Review

**Verdict: CHANGES REQUIRED** (2026-10-19). Good foundations; the two riskiest pieces (keychain, file logging) are unproven and have small defects.

Verified by reviewer: forced `turbo run lint typecheck test build` pass (desktop 35 tests, api 1); `cargo test` 3 pass; no raw `invoke(` outside bindings; `tauri-specta`/`specta`/`specta-typescript` pinned exactly; capabilities all commented; ports are vendor-neutral; apiClient handles timeout/caller-abort/schema errors; config fails fast with a readable error; `.env.development` contains no secrets.

Must fix:

1. **Keychain unproven.** `keyring` 4.x is built on `keyring-core` with per-platform stores; the default `v1` feature enables the native stores, but nobody has shown `Entry::new` + set/get/delete works (and persists) on a real keychain. Add an `#[ignore]` Rust integration test `keychain_roundtrip` using a unique throwaway service name (set, get == value, delete, get == None, delete again ok) and clean up on failure. The user will run it: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml -- --ignored keychain_roundtrip`. If `Entry::new` needs an explicit default store in this keyring version, fix it.
2. **Possible infinite log loop.** `file-logger.ts` uses `void debug(...)`. If the plugin call rejects (e.g. capability denied), the rejection hits the global `unhandledrejection` handler, which logs again, which rejects again. Catch each call and swallow/`console` fallback (never log from the catch through the same logger). Add a test.
3. **File logging never exercised.** `createPorts()` uses the console logger in dev, so the file adapter, rotation and redaction-in-file are unverifiable locally. Add an optional `VITE_LOG_TARGET` (`console` | `file`, in the Zod config schema and `.env.example`; default console in dev, file otherwise) so the file logger can be forced in `tauri dev`.
4. **Bindings path depends on cwd.** `BINDINGS_PATH` is relative; the debug startup export `.expect(...)`s and panics if the binary is launched from another directory. Build the path from `env!("CARGO_MANIFEST_DIR")`, and log a warning instead of panicking if export fails in debug.
5. **apiClient mislabels bad JSON.** A 2xx response with a non-JSON body throws a `SyntaxError` that is mapped to `network`. Map `response.json()` failures to `invalid_response`. Add a test.
6. **No test for `secureStorage.ts`.** Add unit tests with mocked bindings: ok path, `AppError` -> `SecureStorageError` (kind preserved), null for missing key.

Notes for later (not blocking): `FeatureFlagPort` is async `isEnabled`; M5.2 requires a synchronous `get`/`subscribe` shape, so reshape it there. Production CSP still allows localhost origins (backlog). Module-level `ports`/`logger` singletons coexist with `usePorts()`; acceptable for non-React code (error handlers).

Manual checks (user): keychain round-trip test above; with `VITE_LOG_TARGET=file` run `tauri dev`, change the theme, then confirm `~/Library/Logs/com.example.tauri-saas-starter/app.log` has the line and no secret values.

### Round 2 (2026-10-19): PASS, gated on one user check

Reviewer verified: forced `turbo run lint typecheck test build` 12/12 pass (desktop 47 tests, api 1); `cargo test` 3 pass + 1 ignored (`keychain_roundtrip`); file logger catches plugin rejections and falls back to console without re-logging; `VITE_LOG_TARGET` in schema, `.env.example` and tests; bindings path from `CARGO_MANIFEST_DIR` with a warning instead of a panic; non-JSON 2xx maps to `invalid_response`; secure storage wrapper tested.

Gate before M3 (user): run `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml -- --ignored keychain_roundtrip`. M3 stores tokens in the keychain, so a failure here becomes the first fix of M3. Minor note: an assertion panic inside the test closure skips the cleanup line; the throwaway entry would remain. Harmless, tidy later.
