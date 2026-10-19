# M2 questions

## Q1 (blocking, PRD rule 14) — typed IPC stack is release-candidate only

Task 2.2 requires `tauri-specta` + `specta`. As of 2026-10-19 the latest versions on
crates.io are:

- `tauri-specta` 2.0.0-rc.25 (latest stable: 1.0.2, which targets Tauri 1)
- `specta` 2.0.0-rc.25 (latest stable: 1.0.5)

The Tauri 2 compatible line exists only as release candidates, and rule 14 says never
install pre-release/rc/beta builds. The stable 1.x pair is not compatible with Tauri 2,
so it is not an option.

Options:

- **A (recommended):** approve `tauri-specta 2.0.0-rc.25` with `specta 2.0.0-rc.25`,
  as a logged exception in `docs/DECISIONS.md`. The bindings themselves are checked in,
  so the app does not depend on the generator at runtime.
- **B:** defer task 2.2 and implement the rest of M2; revisit when 2.0.0 stable ships.
  This leaves the M2 acceptance criterion ("`bindings.ts` is generated, committed") open.
- **C:** something else you specify. Note that hand-writing an `invoke` wrapper or using
  `ts-rs` would conflict with PRD rule 3 ("Rust commands are exposed to TS via
  `tauri-specta` generated bindings").

Please reply A or B (or give another direction). I will not modify Rust IPC code until
this is answered.

## Q2 (non-blocking, default assumed) — when `gen:bindings` runs in dev

Task 2.2 says "run it in dev build". The default I intend:

- `gen:bindings` is a standalone script (`cargo test ... export_bindings`).
- `tauri.conf.json` `beforeDevCommand` becomes `pnpm gen:bindings && pnpm dev`, so the
  bindings are refreshed before each `tauri dev` start and the committed file stays
  current.

This adds a short cargo step to dev startup. Say so if you prefer a manual-only script.
