# M6: Billing & Licensing

**Goal:** Subscriptions via a merchant-of-record (Dodo Payments), entitlements enforced in app, offline grace.
**Prereqs:** M5 PASS. Reviewer approves entitlement design (6.0) first.

## Tasks

- [ ] 6.0 **Design note first** `docs/billing-design.md`: plan/entitlement model, how checkout opens and returns, webhook -> entitlement flow, offline grace rules. STOP for reviewer OK.
- [x] 6.1 Shared schemas: `PlanSchema`, `EntitlementSchema` (plan, status: active|trialing|past_due|canceled|none, currentPeriodEnd, features: string[]), in `packages/shared`.
- [x] 6.2 `apps/api`: tables `customers`, `subscriptions`, `webhook_events` (store event id for idempotency). Endpoints: `POST /billing/checkout` (creates checkout session for authed user + plan id, returns URL), `GET /billing/entitlement`, `POST /billing/portal` (customer portal URL).
- [x] 6.3 Webhook endpoint `POST /webhooks/dodo`: verify signature, reject invalid, idempotent by event id, handle subscription active/renewed/on_hold/canceled/expired events, update `subscriptions`. Return 2xx fast; do work safely. Raw body needed for signature verification.
- [x] 6.4 Plans defined in one config file (`apps/api/src/billing/plans.ts`) mapping plan key -> provider product id -> feature list. No product ids hardcoded elsewhere.
- [x] 6.5 `BillingPort` real adapter `DodoBillingAdapter` (desktop side calls OUR api only; Dodo secrets live only on the server): `getEntitlement()`, `startCheckout(planKey)`, `openPortal()`.
- [x] 6.6 Checkout flow: open URL in system browser; return via deep link `myapp://billing/success`; on return and on window focus, poll `getEntitlement` (max 2 min, backoff) until active.
- [x] 6.7 Entitlement store + `useEntitlement()`, `useCan(feature)`, `<Gate feature="x" fallback={<UpgradePrompt/>}>`. Enforcement ALSO checked server-side on any paid API route (middleware `requireFeature("x")`).
- [x] 6.8 Offline grace: cache last entitlement (signed by server with an expiry `validUntil`, verified on client with embedded public key). If offline, honor cached entitlement until `validUntil` (default 7 days); after that, degrade to free tier with a clear message.
- [x] 6.9 UI: pricing page (plans from API), current plan card, "Manage subscription" (portal), upgrade prompt component, past_due banner.
- [x] 6.10 Test mode: use Dodo test environment via env flag; document test cards link in `docs/billing.md`. Add `docs/billing.md` for adding a plan.
- [x] 6.11 Tests: webhook signature reject, idempotency (same event twice), state transitions, grace expiry logic, `useCan` gating.

## Acceptance criteria

- Test-mode purchase flips app to paid within ~30s, no restart.
- Replaying the same webhook does not double-apply.
- Tampered or unsigned webhook rejected with 401/400.
- Offline within grace: paid features work. After `validUntil`: downgraded.
- Paid API route returns 403 for free user even if client is tampered with.
- No Dodo secret or API key present in desktop bundle (grep built assets).
- Tests, lint, typecheck green.

## Out of scope

Usage-based billing, seats/teams, coupons, invoices UI.

## Verification commands

```
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter api test
pnpm --filter desktop build && grep -r "DODO" apps/desktop/dist   # must be empty
```

## Review checklist

- [ ] Server is the source of truth; client gating is UX only.
- [ ] Webhook verification uses raw body and constant-time compare.
- [ ] Signed entitlement cache can't be forged by editing local file.
- [ ] Plans in one place.

## Agent report

**Status: complete for M6.1-M6.11 (2026-10-20), test mode only. Awaiting review.**
M6.0 stays unticked because it was the design gate; the approved revision is in
`docs/billing-design.md`.

### What shipped

- **6.1 Shared schemas.** `packages/shared/src/billing.ts`: plans, statuses,
  `EntitlementPayload`/`Entitlement`, plan summaries, checkout/portal responses
  and `canonicalEntitlement`.
- **6.2 API.** `customers`, `subscriptions`, `checkout_sessions`,
  `webhook_events` tables with a Drizzle migration. Routes under `requireAuth`:
  `GET /billing/plans`, `GET /billing/entitlement`, `POST /billing/checkout`
  (409 + portal hint when already active), `POST /billing/portal`; plus the
  public bounce page `GET /billing/return` and the paid example
  `GET /billing/paid-example` behind `requireFeature("export")`.
- **6.3 Webhooks.** `POST /webhooks/dodo` reads the raw body, verifies with
  `standardwebhooks@1.1.1`, stores the `webhook-id` idempotently in the same
  transaction, and handles active/renewed/past_due/on_hold/paused/unpaused/
  cancelled/expired/plan_changed/failed. Refunds/disputes and unknown events are
  log-only 200. Out-of-order events are compared per current subscription; a
  late `expired` for an old subscription cannot downgrade a newer one.
- **6.4 Plans.** `apps/api/src/billing/plans.ts` is the only product-id mapping.
- **6.5 BillingPort.** Desktop adapter calls our API only; the system browser is
  opened by the adapter via `tauri-plugin-opener`.
- **6.6 Checkout.** API bounce page redirects to a parameterless deep link; the
  desktop refetches on the deep link and on window focus, polling for up to two
  minutes.
- **6.7 Entitlement store/UI.** `useEntitlement`, `useCan`, `<Gate>`, pricing
  page, manage-subscription, past_due banner, upgrade prompt, `/export` example.
- **6.8 Grace.** ECDSA P-256/IEEE P1363 snapshots, fixed canonical JSON, `kid`
  selection over embedded public keys, clock-rollback guard, per-user cache
  cleared on sign-out, `validUntil = min(now + 7d, currentPeriodEnd + 3d)`.
- **6.9/6.10.** Pricing and status UI; `docs/billing.md` documents plans, test
  cards, safety and the test-mode/tunnel handoff.
- **6.11 Tests and guards.** Live-mode refusal matrix, webhook signature
  failures (tampered, wrong secret, stale, missing), idempotency, transitions,
  out-of-order, unknown user, `requireFeature`, account-deletion guard, grace
  expiry, tampered/expired/rolled-back snapshots, Gate gating, bundle scan and a
  staged-secret check wired into the pre-commit hook.

### Verification (real output)

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  29 passed (29)
desktop:test:       Tests  106 passed (106)
api:test:  Test Files  10 passed (10)
api:test:       Tests  42 passed (42)
 Tasks:    2 successful, 2 total

$ cd apps/desktop/src-tauri && cargo test
running 4 tests
test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

$ pnpm --filter desktop verify:bundle-secrets
No billing secrets in the desktop bundle

$ node scripts/check-secrets.mjs
(staged scan clean)

$ pnpm db:up
$ DB_PORT=5433 DATABASE_URL_DIRECT="postgres://app:app@127.0.0.1:5433/app" pnpm --filter api db:migrate
[✓] migrations applied successfully!
$ docker compose exec -T db psql -U app -d app -c "\dt"
 checkout_sessions | table | app
 customers         | table | app
 subscriptions     | table | app
 webhook_events    | table | app

$ pnpm --filter api test
 Test Files  10 passed (10)
      Tests  42 passed (42)
```

### Not run (user-gated)

- Real test-mode checkout, portal, and webhook delivery through a tunnel: the
  reviewer has not said the test keys are in `apps/api/.env`.
- `subscription.cancelled` timing, scheduled-cancel fields, metadata echo and
  return-URL query parameters: assumptions marked "verify in test mode" in the
  design note. No account tooling or credentials were touched.

## Review

_(reviewer fills)_
