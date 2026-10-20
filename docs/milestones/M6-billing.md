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

**Verdict: CHANGES REQUIRED** (2026-10-20). Strong foundation and the safety rules were followed; the findings below are logic gaps that would matter with real money. Forced `turbo run lint typecheck test build` 12/12 (desktop 106 tests, api 42); bundle contains no billing secrets; compose DB stopped after review.

Verified by reviewer: fail-closed live-mode matrix (`assertPaymentsSafety` at startup, default `test_mode`); webhook verified with `standardwebhooks` over the raw body, dedupe insert inside the same transaction, per-subscription out-of-order handling (late `expired` of an old subscription is ignored); all billing routes behind `requireAuth` with the user id from the verified JWT only; checkout session stored server-side and webhooks mapped through it; portal uses the server-stored customer id; ECDSA P-256 IEEE P1363 signing with `kid`, fixed canonical JSON and WebCrypto verification; per-user cache cleared on sign-out; account deletion blocked while a subscription may bill (wired through Better Auth `deleteUser.beforeDelete`); `/billing/*` rate limited; pre-commit secret guard and bundle scan.

Must fix:

1. **Plan is not derived from the product id.** `handleDodoWebhook` takes `planKey` from the checkout row or webhook metadata and defaults to `"pro"`; the event's `product_id` is never checked against `plans.ts`, and an arbitrary metadata string is stored. Any subscription event that resolves to a known user would grant Pro, including products unrelated to this app in the same Dodo account. Map `product_id` -> plan through `plans.ts` only, validate with `isPlanKey`, and ignore (log, 200) subscriptions for unknown products. Tests: unknown product ignored; metadata plan cannot override the product mapping.
2. **Access depends on receiving `expired`/`cancelled`.** `resolveAccess` returns Pro for `active`/`trialing` regardless of `currentPeriodEnd`, so a missed or failed webhook gives free Pro forever (server enforcement included). Add a server-side safety net: `active`/`trialing` whose `currentPeriodEnd` is more than 3 days in the past (or, when null, `providerEventAt` more than 35 days old) resolve to free. Tests for both.
3. **Brief outage downgrades paying users.** In `entitlement-store.refresh`, a 503 (adapter returns `null`) overwrites the cached entitlement with `null`. Keep the last verified snapshot on 503 and on network errors (mark offline), and only replace on a successful signed response.
4. **Double subscription from `past_due`.** `/billing/checkout` returns 409 only for `active`/`trialing`; a `past_due` user can start a second checkout. Return 409 with the portal hint for `past_due` as well. Test.
5. **Webhook hardening.** Cap the request body (1 MB) and rate limit `/webhooks/dodo`; make `customers.provider_customer_id` unique and handle a `subscriptions.provider_subscription_id` collision explicitly (no 500 loop). Add `subscription.plan_changed` handling by product id, or remove the claim from the report and docs.
6. **Secret guard gaps.** `scripts/check-secrets.mjs` misses `ENTITLEMENT_SIGNING_KEY=` (raw base64 PKCS8), `BETTER_AUTH_SECRET=` and `DATABASE_URL=` with an embedded password. Add them, and unit test the script's patterns with sample strings (positive and negative).
7. **Missing public keys fail silently.** With `VITE_ENTITLEMENT_PUBLIC_KEYS` empty, `saveEntitlement` returns false and offline grace never works, with no signal. Warn once in the log and show it in a dev-only note; add a script/doc step that prints the public JWK for a given private key.
8. **Clock-rollback guard is weak.** `highestIssuedAt` sits unsigned next to the snapshot. Also reject a snapshot when `now + 60s < issuedAt` (signed field), and keep a high-water "latest time seen" in the OS keychain (`secureStorage`) updated on every read, rejecting the cache when the clock is earlier. Document honestly in docs/billing.md that this deters casual clock changes only.

Notes (not blocking): Dodo request/response field names (`product_cart`, `checkout_url`, `session_id`, portal `link`) and cancellation timing remain "verify in test mode" (user-gated); the 4 `trialing`-related paths have no producing event; real test-mode runs need the user's test keys and a tunnel.

### Review fix round (2026-10-20)

1. Webhooks now derive the plan from the event `product_id` through
   `plans.ts` only (`planForProductId`); unknown products are logged and ignored
   with 200. The metadata `plan_key` override and the `"pro"` default are gone.
   Tests cover unknown products, metadata spoofing, and `plan_changed`.
2. `resolveAccess` degrades `active`/`trialing` to free when
   `currentPeriodEnd` is more than 3 days past, or when the period end is null
   and `providerEventAt` is over 35 days old. Both apply to `requireFeature` and
   the signed entitlement. Tests added.
3. `entitlement-store.refresh` keeps the last verified snapshot on a 503 and on
   network errors, marking the state offline; only a successful signed response
   replaces it. Tests added.
4. Checkout returns 409 with the portal hint for `past_due` too. Test added.
5. `/webhooks/dodo` rejects bodies over 1 MB (declared or actual), has its own
   rate limit, `customers.provider_customer_id` is unique (migration 0003), and
   subscription-id collisions are acknowledged without a retry loop. The body
   test is included; `subscription.plan_changed` is now implemented by product
   id.
6. `scripts/secret-patterns.mjs` adds entitlement-key, auth-secret and
   database-password patterns; the pre-commit hook uses it and an API unit test
   covers positive and negative samples.
7. Empty `VITE_ENTITLEMENT_PUBLIC_KEYS` warns once and shows a dev-only note on
   the pricing page; `scripts/print-entitlement-public-key.mjs` prints the JWK,
   and `docs/billing.md` documents key generation.
8. Snapshot validation rejects `now + 60s < issuedAt`, records a high-water
   "latest time seen" in the OS keychain on read/save, and rejects the cache when
   the clock is earlier. `docs/billing.md` states this deters casual changes only.

Verification:

```
$ pnpm turbo run lint typecheck build
 Tasks:    10 successful, 10 total

$ pnpm turbo run test --force
desktop:test:  Test Files  30 passed (30)
desktop:test:       Tests  111 passed (111)
api:test:  Test Files  11 passed (11)
api:test:       Tests  51 passed (51)
 Tasks:    2 successful, 2 total

$ cd apps/desktop/src-tauri && cargo test
test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

$ pnpm --filter desktop verify:bundle-secrets
No billing secrets in the desktop bundle

$ DB_PORT=5433 DATABASE_URL_DIRECT="postgres://app:app@127.0.0.1:5433/app" pnpm --filter api db:migrate
[✓] migrations applied successfully!
```
