# M6: Billing & Licensing

**Goal:** Subscriptions via a merchant-of-record (Dodo Payments), entitlements enforced in app, offline grace.
**Prereqs:** M5 PASS. Reviewer approves entitlement design (6.0) first.

## Tasks
- [ ] 6.0 **Design note first** `docs/billing-design.md`: plan/entitlement model, how checkout opens and returns, webhook -> entitlement flow, offline grace rules. STOP for reviewer OK.
- [ ] 6.1 Shared schemas: `PlanSchema`, `EntitlementSchema` (plan, status: active|trialing|past_due|canceled|none, currentPeriodEnd, features: string[]), in `packages/shared`.
- [ ] 6.2 `apps/api`: tables `customers`, `subscriptions`, `webhook_events` (store event id for idempotency). Endpoints: `POST /billing/checkout` (creates checkout session for authed user + plan id, returns URL), `GET /billing/entitlement`, `POST /billing/portal` (customer portal URL).
- [ ] 6.3 Webhook endpoint `POST /webhooks/dodo`: verify signature, reject invalid, idempotent by event id, handle subscription active/renewed/on_hold/canceled/expired events, update `subscriptions`. Return 2xx fast; do work safely. Raw body needed for signature verification.
- [ ] 6.4 Plans defined in one config file (`apps/api/src/billing/plans.ts`) mapping plan key -> provider product id -> feature list. No product ids hardcoded elsewhere.
- [ ] 6.5 `BillingPort` real adapter `DodoBillingAdapter` (desktop side calls OUR api only; Dodo secrets live only on the server): `getEntitlement()`, `startCheckout(planKey)`, `openPortal()`.
- [ ] 6.6 Checkout flow: open URL in system browser; return via deep link `myapp://billing/success`; on return and on window focus, poll `getEntitlement` (max 2 min, backoff) until active.
- [ ] 6.7 Entitlement store + `useEntitlement()`, `useCan(feature)`, `<Gate feature="x" fallback={<UpgradePrompt/>}>`. Enforcement ALSO checked server-side on any paid API route (middleware `requireFeature("x")`).
- [ ] 6.8 Offline grace: cache last entitlement (signed by server with an expiry `validUntil`, verified on client with embedded public key). If offline, honor cached entitlement until `validUntil` (default 7 days); after that, degrade to free tier with a clear message.
- [ ] 6.9 UI: pricing page (plans from API), current plan card, "Manage subscription" (portal), upgrade prompt component, past_due banner.
- [ ] 6.10 Test mode: use Dodo test environment via env flag; document test cards link in `docs/billing.md`. Add `docs/billing.md` for adding a plan.
- [ ] 6.11 Tests: webhook signature reject, idempotency (same event twice), state transitions, grace expiry logic, `useCan` gating.

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
_(agent fills)_

## Review
_(reviewer fills)_
