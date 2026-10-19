# M2: Core Infrastructure

**Goal:** Foundations every feature depends on: config, logging, ports, typed IPC, secure storage.
**Prereqs:** M1 PASS.

## Tasks
- [ ] 2.1 Env/config: `shared/lib/config.ts` parses `import.meta.env` with a Zod schema (`VITE_API_URL`, `VITE_APP_ENV` = dev|staging|prod, plus optional vendor keys). App fails fast with a readable error screen if invalid. Provide `.env.example`. Environments: dev, staging, prod.
- [ ] 2.2 Typed IPC: add `tauri-specta` (+ `specta`), generate `src/shared/ipc/bindings.ts` from Rust commands. Add npm script `gen:bindings` and run it in dev build. Add a sample command `get_app_info` (version, os, arch) and use it in the settings page footer.
- [ ] 2.3 Secure storage (Rust): commands `secure_set(key, value)`, `secure_get(key)`, `secure_delete(key)` using the `keyring` crate (OS keychain). Service name from app identifier. Values never logged. TS wrapper `shared/lib/secureStorage.ts` using generated bindings.
- [ ] 2.4 Logger port: `ports/LoggerPort.ts` (`debug|info|warn|error(msg, ctx?)`). Adapter `ConsoleLogger` for dev. Adapter writing to file through `tauri-plugin-log` (rotation: 5 files x 2MB, in app log dir). Redact keys named `token`, `password`, `authorization`, `secret`. Wire global error handlers from M1.9 to the logger.
- [ ] 2.5 Define port interfaces ONLY (no vendor code yet), each in `src/ports/`: `AuthPort`, `BillingPort`, `FeatureFlagPort`, `AnalyticsPort`, `ErrorReporterPort`, `StoragePort`. Keep them small and promise-based. Add JSDoc per method.
- [ ] 2.6 Provide no-op/in-memory adapters for each port in `ports/adapters/noop/`. A `ports/index.ts` composition root picks adapters by config, exposes them via React context (`usePorts()`).
- [ ] 2.7 API client: `shared/lib/apiClient.ts` using `fetch`. Base URL from config, JSON in/out, Zod-validated responses via helper `request(schema, opts)`, typed `ApiError`, timeout (15s) using AbortController, auth header injected from a pluggable token provider (set in M3). Use Tauri http plugin only if CSP/CORS requires it; document the choice in DECISIONS.md.
- [ ] 2.8 Rust: central `AppError` enum implementing `serde::Serialize`; commands return `Result<T, AppError>`. Generated types reflect it.
- [ ] 2.9 Tauri capabilities: add only permissions used so far (store, log, window-state, keyring commands). Document each permission in a comment.
- [ ] 2.10 Unit tests: config parsing (valid/invalid), logger redaction, apiClient error mapping + timeout (mock fetch). Rust test for AppError serialization.

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
_(agent fills)_

## Review
_(reviewer fills)_
