# Billing design (M6.0)

Status: **approved with changes** (2026-10-20). This revision incorporates the
reviewer's decisions; implementation follows in M6.1-M6.11.

## Payments safety rules (applies to this and later milestones)

- **Test mode only.** The provider is Dodo Payments test mode
  (`https://test.dodopayments.com`). Live mode is refused unless both
  `NODE_ENV=production` and `ALLOW_LIVE_PAYMENTS=true` are set, and only after
  the reviewer explicitly enables it.
- **No account-connected tooling.** No MCP server, no `dodo` CLI login, no
  browser session, no saved credential from any other project. The only
  credential source is `apps/api/.env`, filled in by the user.
- **Secrets stay server-side.** `DODO_PAYMENTS_API_KEY` and
  `DODO_PAYMENTS_WEBHOOK_KEY` live only in the API environment. They never
  reach the desktop bundle, logs, error reports or the repo. `.env.example`
  holds empty placeholders and a commit guard rejects key-shaped values.
- **Local fakes until test keys arrive.** Webhooks are tested with payloads
  signed locally by the test suite. Real test-account flows start only when the
  reviewer says the test keys are in `apps/api/.env`; a tunnel for delivery is
  set up by the user.

## Reviewer decisions

1. **Event names** follow the current Dodo docs:
   `subscription.active`, `subscription.renewed`, `subscription.past_due`,
   `subscription.on_hold`, `subscription.cancelled` (two l's),
   `subscription.expired`, `subscription.failed`, `subscription.plan_changed`.
   Use `subscription.renewed` to extend access, not `payment.succeeded`.
   Unknown events are logged and acknowledged with 200.
   Sources: [webhook events guide](https://docs.dodopayments.com/developer-resources/webhooks/intents/webhook-events-guide)
   and [subscription webhooks](https://docs.dodopayments.com/developer-resources/webhooks/intents/subscription).
2. **Cancellation timing.** `subscription.cancelled` fires when the cancellation
   takes effect, so access ends then. If the payload exposes a scheduled
   cancellation (`cancel_at_next_billing_date` or similar), store it as
   `cancel_at_period_end` and keep access until `current_period_end`.
   Assumption to verify in test mode.
3. **Bounce page.** `return_url` is an HTTPS API page,
   `GET /billing/return`, which shows "return to the app" and redirects to the
   plain deep link `tauri-saas-starter://billing/success` with **no parameters**.
   Dodo appends `payment_id`/`status`/`email` to the return URL; the API never
   forwards them. The deep link only triggers an entitlement refetch and carries
   no authority.
4. **Checkout mapping.** A `checkout_sessions` row (session id, user id, plan
   key) is written when the session is created. Webhooks resolve the user
   through that row, then through `provider_customer_id` and
   `provider_subscription_id` once known. Webhook metadata is only a secondary
   signal.
5. **Out-of-order events.** Track the newest event per
   `provider_subscription_id`. Ignore events for a subscription that is not the
   user's current one unless they are a newer `active`. A late `expired` for an
   old subscription never downgrades a newer one.
6. **Signed entitlement snapshot.** ECDSA P-256/SHA-256 with IEEE P1363
   encoding (`dsaEncoding: "ieee-p1363"` in Node) so WebCrypto verifies it.
   Canonical JSON: UTF-8, object keys in the documented order
   `{ v, kid, userId, plan, status, features, currentPeriodEnd, issuedAt,
validUntil }`, arrays in plan order, no whitespace, `null` for absent values.
   Include `kid`; the desktop embeds a list of public keys and picks by `kid`.
   Clock-rollback guard: store the highest server time seen per user and refuse
   a snapshot whose `issuedAt` is earlier than that, and refuse to extend
   `validUntil` when the system clock is earlier than the stored time.
   `validUntil = min(now + 7d, currentPeriodEnd + 3d)`.
7. **Checkout conflict and limits.** `POST /billing/checkout` returns **409**
   with `{ error: "already_subscribed", portalUrl }` when the user is
   `active`/`trialing`. All `/billing/*` routes are rate limited.
8. **Account deletion.** Deletion is blocked with a clear error while a
   subscription is `active`/`trialing`/`past_due`; the user must cancel first.
   This avoids orphaning a live subscription at the merchant of record.
9. **Refunds and disputes** (`refund.*`, `dispute.*`) are log-only in this
   version; documented as a known limitation (no automatic entitlement change).
10. **Webhook verification** uses the maintained `standardwebhooks@1.1.1`
    library (latest stable, logged in `DECISIONS.md`) with the raw body. Tests
    still sign payloads locally.
11. **Threat model.** Client checks (`Gate`, `useCan`) are a UX deterrent and
    can be bypassed by editing the app or its cache. The real protection is the
    server: every paid API route runs `requireFeature` against the database
    entitlement. A forged or rolled-back snapshot cannot unlock a server route.
12. **Open decisions** from the previous revision: (1) demo plans approved;
    (2) 7-day grace approved with the 3-day margin above; (3) cancellation per
    item 2; (4) ECDSA P-256 per item 6; (5) inline webhook processing approved.

## Environment and fail-closed startup

| Variable                    | Values                               | Notes                                         |
| --------------------------- | ------------------------------------ | --------------------------------------------- |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` (default) \| `live_mode` | Chooses the API base URL.                     |
| `ALLOW_LIVE_PAYMENTS`       | `true` only                          | Required for `live_mode`.                     |
| `NODE_ENV`                  | `production` required for live       |                                               |
| `DODO_PAYMENTS_API_KEY`     | test key                             | Server only, redacted in logs.                |
| `DODO_PAYMENTS_WEBHOOK_KEY` | `whsec_...`                          | Signing secret, server only.                  |
| `DODO_PAYMENTS_PRODUCT_PRO` | product id                           | Mapping lives in `plans.ts`, not scattered.   |
| `ENTITLEMENT_SIGNING_KEY`   | base64 PKCS#8 ECDSA P-256            | Server signs entitlement snapshots.           |
| `ENTITLEMENT_SIGNING_KID`   | short key id                         | Goes into the snapshot.                       |
| `API_PUBLIC_URL`            | HTTPS base                           | Builds `/billing/return` for the bounce page. |

Startup validation order:

1. Parse with Zod. Default the environment to `test_mode`.
2. If `live_mode` and `NODE_ENV !== "production"` → refuse to start.
3. If `live_mode` and `ALLOW_LIVE_PAYMENTS !== "true"` → refuse to start.
4. If a required test credential is missing, billing routes return
   `503 billing_unavailable`; the rest of the API still starts.

A unit test covers the live-mode matrix (refused in dev without/with the flag,
refused in prod without the flag, accepted only with both).

## Plans and entitlements

One config file, `apps/api/src/billing/plans.ts`:

```ts
export const PLANS = {
  free: { productId: null, features: [] },
  pro: {
    productId: env.DODO_PAYMENTS_PRODUCT_PRO,
    features: ["export", "sync"],
  },
} as const;
```

- Plan keys are stable identifiers; the client sends only a plan key.
- Product ids exist only in this file (and env); no route or UI knows them.
- Features are strings shared with the desktop (`EntitlementSchema.features`).

Entitlement shape (`packages/shared`), server-computed:

```ts
{
  plan: "free" | "pro",
  status: "active" | "trialing" | "past_due" | "canceled" | "none",
  currentPeriodEnd: string | null,
  features: string[],
  validUntil: string,
  kid: string,
  signature: string
}
```

Rules:

- `active` / `trialing` → the plan's features.
- `past_due` → keep features until `past_due_ends_at` (or
  `current_period_end` if absent), show a banner.
- `canceled` / `expired` → features until `currentPeriodEnd` (scheduled
  cancellation), then `free`.
- `none` → `free`.
- The server is the source of truth. Client gating is UX; every paid API route
  uses `requireFeature("x")` and returns 403 for free users even if the client is
  modified.

## Checkout

Desktop: `BillingPort.startCheckout(planKey)` → `POST /billing/checkout`
(authenticated) → API inserts `checkout_sessions` and creates a Dodo checkout
session (`POST {base}/checkouts`) with:

- `product_cart: [{ product_id: PLANS[planKey].productId, quantity: 1 }]`
- `customer: { email }` from the verified session
- `return_url: ${API_PUBLIC_URL}/billing/return` (HTTPS bounce page)
- `metadata: { user_id, plan_key }` (server-derived user id)
- `cancel_url`: the API bounce page variant (no sensitive parameters)

The API returns `{ url }`. The desktop opens it with `tauri-plugin-opener`
(system browser), then polls `GET /billing/entitlement` on the deep-link return
and on window focus, with backoff for up to 2 minutes until `active`.
`GET /billing/return` renders a minimal page (no secrets, no query echoing) that
links to the parameterless deep link.

Never open checkout from a webview; the payment page must run in the user's
browser so credentials and 3-DS stay outside the app.

## Webhook → entitlement flow

`POST /webhooks/dodo`:

1. Read the **raw** body (no JSON parser before verification).
2. Verify with `standardwebhooks`: signed content
   `{webhook-id}.{webhook-timestamp}.{raw_body}`, `whsec_` base64 secret,
   constant-time compare, 5-minute timestamp tolerance. Invalid → 401.
3. Idempotency: insert `webhook-id` into `webhook_events` (unique) inside the
   same transaction as the state change. Duplicate → 200, no work.
4. Resolve the user in this order: `checkout_sessions` (session id from the
   payment/subscription), `customers.provider_customer_id`,
   `subscriptions.provider_subscription_id`, then webhook metadata.
5. Apply the event:

| Event                       | Effect                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `subscription.active`       | `active`, plan from the checkout row                                                                        |
| `subscription.renewed`      | `active`, extend `currentPeriodEnd`                                                                         |
| `subscription.past_due`     | `past_due`, store `past_due_ends_at`                                                                        |
| `subscription.on_hold`      | `past_due` (access until the stored deadline)                                                               |
| `subscription.paused`       | `past_due`                                                                                                  |
| `subscription.unpaused`     | `active`                                                                                                    |
| `subscription.plan_changed` | update plan key/features                                                                                    |
| `subscription.cancelled`    | `canceled` when it takes effect; if a scheduled-cancel field is present, keep `active` until the period end |
| `subscription.failed`       | log; no entitlement change (creation failed)                                                                |
| `subscription.expired`      | `none` if it is the current subscription                                                                    |
| `refund.*`, `dispute.*`     | log only (known limitation)                                                                                 |
| anything else               | log and 200                                                                                                 |

6. Out-of-order: accept only events newer than the stored event time for that
   subscription, except a newer `active` for a subscription that became the
   current one. A late `expired` from an old subscription is ignored.
7. Return 200 after the transaction commits. If processing throws, the insert
   rolls back and the provider retries (up to 8 attempts).

`subscriptions` row: `user_id`, `plan_key`, `provider_subscription_id` (unique),
`provider_customer_id`, `status`, `current_period_end`, `past_due_ends_at`,
`cancel_at_period_end`, `provider_event_at`, timestamps. `customers` row:
`user_id` (unique), `provider_customer_id`. `checkout_sessions`: `session_id`
(unique), `user_id`, `plan_key`, timestamps.

## Offline grace

`GET /billing/entitlement` returns the entitlement plus a signed snapshot:

- Canonical JSON with the fixed field order from reviewer decision 6.
- `validUntil = min(now + 7d, currentPeriodEnd + 3d)`.
- Signature: ECDSA P-256/SHA-256, IEEE P1363, `kid` in the payload. The
  desktop embeds one or more public keys and selects by `kid`. The private key
  is `ENTITLEMENT_SIGNING_KEY` on the server only.
- The desktop caches the snapshot per user id, revalidates signature, user id,
  `kid` and expiry on every read, and refuses a tampered file.
- Clock-rollback guard: store the highest `issuedAt` seen. If the system clock
  is earlier, refuse a snapshot with an older `issuedAt` and do not extend
  `validUntil`.

Behavior:

- Online: use the server response, refresh the cache.
- Offline within `validUntil`: honor the cached features, show an "offline,
  using the last known plan" note.
- Offline after `validUntil`: degrade to `free`, show a clear renewal/connection
  message. No silent paid access.
- Sign-out or user change: discard the cached snapshot (same rule as flags).

## Account deletion

`DELETE /account` (or the existing deletion route) checks the subscription:
`active`/`trialing`/`past_due` blocks deletion with
`409 { error: "active_subscription" }` and a pointer to the portal. The user
cancels, then deletes. Chosen over auto-cancel to avoid a silent money-affecting
action.

## Desktop API

- `BillingPort`: `getEntitlement()`, `startCheckout(planKey)`, `openPortal()`.
- `useEntitlement()`, `useCan(feature)`, `<Gate feature fallback>`.
- Pricing page reads plans from `GET /billing/plans`; current plan card;
  "Manage subscription" calls `POST /billing/portal` and opens the returned URL.
- `past_due` banner and an upgrade prompt component.
- Paid example route/server route guarded by `requireFeature("export")`.

## Tests before real keys

- Live-mode refusal matrix (env).
- Webhook signature: valid locally signed payload accepted; tampered body,
  wrong secret, stale timestamp and missing headers rejected with 401.
- Idempotency: same `webhook-id` twice applies once.
- Transitions (`active`, `renewed`, `past_due`, `on_hold`, `unpaused`,
  `cancelled`, `expired`, `plan_changed`, `failed`), out-of-order (including an
  old `expired` not downgrading a newer subscription), and unknown-user events.
- `requireFeature` returns 403 for free and allows paid.
- Grace: signed snapshot accepted, tampered/expired snapshot rejected, clock
  rollback refused, expiry degrades to free.
- `useCan` gating and the upgrade prompt.
- Build grep: no `DODO` or `whsec_` in `apps/desktop/dist`.
- A commit guard script fails on key-shaped values.

## Verify in test mode (do not assume)

- Whether `subscription.cancelled` carries a scheduled-cancel field and when it
  fires.
- Whether `return_url` receives `payment_id`/`status`/`email` and their exact
  names.
- Whether subscription webhooks echo metadata and on which object.
- `past_due_ends_at` presence on `subscription.past_due`.

## Docs

- [Webhook events](https://docs.dodopayments.com/developer-resources/webhooks/intents/webhook-events-guide)
- [Subscription events](https://docs.dodopayments.com/developer-resources/webhooks/intents/subscription)
- [Webhook verification](https://docs.dodopayments.com/developer-resources/webhooks)
- [Checkout session create](https://docs.dodopayments.com/api-reference/checkout-sessions/create)
