# Billing design (M6.0)

Status: **design for reviewer approval**. No billing code is written yet.

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
  holds empty placeholders and a check rejects key-shaped committed values.
- **Local fakes until test keys arrive.** Webhooks are tested with payloads
  signed locally by the test suite. Real test-account flows start only when the
  reviewer says the test keys are in `apps/api/.env`; a tunnel for delivery is
  set up by the user.

## Environment and fail-closed startup

| Variable                    | Values                               | Notes                                       |
| --------------------------- | ------------------------------------ | ------------------------------------------- |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` (default) \| `live_mode` | Chooses the API base URL.                   |
| `ALLOW_LIVE_PAYMENTS`       | `true` only                          | Required for `live_mode`.                   |
| `NODE_ENV`                  | `production` required for live       |                                             |
| `DODO_PAYMENTS_API_KEY`     | test key                             | Server only, redacted in logs.              |
| `DODO_PAYMENTS_WEBHOOK_KEY` | `whsec_...`                          | Signing secret, server only.                |
| `DODO_PAYMENTS_PRODUCT_PRO` | product id                           | Mapping lives in `plans.ts`, not scattered. |
| `ENTITLEMENT_SIGNING_KEY`   | base64 PKCS#8 ECDSA P-256            | Server signs entitlement snapshots.         |

Startup validation order:

1. Parse with Zod. Default the environment to `test_mode`.
2. If `live_mode` and `NODE_ENV !== "production"` → refuse to start.
3. If `live_mode` and `ALLOW_LIVE_PAYMENTS !== "true"` → refuse to start.
4. If a required test credential is missing, billing endpoints return
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
  validUntil: string,      // signed snapshot expiry
  signature: string
}
```

Rules:

- `active` / `trialing` → the plan's features.
- `past_due` → keep features until `currentPeriodEnd`, show a banner, no new
  checkout until the provider resolves.
- `canceled` / `expired` → features until `currentPeriodEnd`, then `free`.
- `none` → `free`.
- The server is the source of truth. Client gating is UX; every paid API route
  uses `requireFeature("x")` and returns 403 for free users even if the client
  is modified.

## Checkout

Desktop: `BillingPort.startCheckout(planKey)` → `POST /billing/checkout`
(authenticated) → API creates a Dodo checkout session
(`POST {base}/checkouts`) with:

- `product_cart: [{ product_id: PLANS[planKey].productId, quantity: 1 }]`
- `customer: { email }` (from the verified session)
- `return_url`: deep link `tauri-saas-starter://billing/success`
- `cancel_url`: `tauri-saas-starter://billing/cancel`
- `metadata: { user_id, plan_key }` (server-derived user id; never trusted from
  the body)

The API returns `{ url }`. The desktop opens it with `tauri-plugin-opener`
(system browser), then polls `GET /billing/entitlement` on the deep-link return
and on window focus, with backoff for up to 2 minutes until `active`.

Never open checkout from a webview; the payment page must run in the user's
browser so credentials and 3-DS stay outside the app.

## Webhook → entitlement flow

`POST /webhooks/dodo`:

1. Read the **raw** body (no JSON parser before verification).
2. Verify Standard Webhooks headers:
   - signed content `{webhook-id}.{webhook-timestamp}.{raw_body}`
   - secret: strip `whsec_`, base64-decode, HMAC-SHA256, base64-encode
   - `webhook-signature` may list several `v1,<sig>` values; accept any match
   - constant-time compare; reject a timestamp more than 5 minutes from now
   - invalid or missing → 401, no processing
3. Idempotency: insert `webhook-id` into `webhook_events` (unique) inside the
   same transaction as the state change. A duplicate is acknowledged with 200
   and skipped.
4. Map `data` to `{ userId, planKey, providerSubscriptionId, status,
currentPeriodEnd }`:

| Event                                         | New status |
| --------------------------------------------- | ---------- |
| `subscription.active`, `subscription.renewed` | `active`   |
| `subscription.trialing` (if present)          | `trialing` |
| `subscription.on_hold`                        | `past_due` |
| `subscription.canceled`                       | `canceled` |
| `subscription.expired`                        | `none`     |

5. Ignore events that do not carry a known `user_id`/`plan_key` in metadata
   (log and 200, so the provider stops retrying).
6. Out-of-order delivery: each row stores the provider event timestamp; apply
   only if it is newer than the stored one, except statuses that must win
   (`expired` always wins).
7. Return 200 after the transaction commits. If processing throws, the insert
   rolls back and the provider retries (up to 8 attempts).

`subscriptions` row: `user_id` (unique), `plan_key`, `provider_subscription_id`,
`status`, `current_period_end`, `provider_event_at`, timestamps. `customers`
row: `user_id`, `provider_customer_id`.

## Offline grace

`GET /billing/entitlement` returns the entitlement plus a signed snapshot:

- Canonical JSON of `{ userId, plan, status, features, currentPeriodEnd,
validUntil, issuedAt }`.
- `validUntil = min(now + 7 days, currentPeriodEnd ?? now + 7 days)`.
- Signature: ECDSA P-256 / SHA-256 over the canonical bytes. The desktop embeds
  the public key; the private key is `ENTITLEMENT_SIGNING_KEY` on the server
  only. (P-256 is used instead of Ed25519 for WebView support.)
- The desktop caches the snapshot per user id (settings file or SQLite),
  revalidates the signature and user id on every read, and refuses a tampered
  file.

Behavior:

- Online: use the server response, refresh the cache.
- Offline within `validUntil`: honor the cached features, show an "offline,
  using the last known plan" note.
- Offline after `validUntil`: degrade to `free`, show a clear renewal/connection
  message. No silent paid access.
- Sign-out or user change: discard the cached snapshot (same rule as flags).

## Desktop API

- `BillingPort`: `getEntitlement()`, `startCheckout(planKey)`, `openPortal()`.
- `useEntitlement()`, `useCan(feature)`, `<Gate feature fallback>`.
- Pricing page reads plans from `GET /billing/plans`; current plan card;
  "Manage subscription" calls `POST /billing/portal` (Dodo customer portal URL).
- `past_due` banner and an upgrade prompt component.

## Tests before real keys

- Live-mode refusal matrix (env).
- Webhook signature: valid locally signed payload accepted; tampered body,
  wrong secret, stale timestamp and missing headers rejected with 401.
- Idempotency: same `webhook-id` twice applies once.
- State transitions, out-of-order guard, and unknown-user events.
- `requireFeature` returns 403 for free and allows paid.
- Grace: signed snapshot accepted, tampered/expired snapshot rejected, expiry
  degrades to free.
- `useCan` gating and the upgrade prompt.
- Build grep: no `DODO` or `whsec_` in `apps/desktop/dist`.

## Open decisions for the reviewer

1. Plan keys: `free` + `pro` with features `["export", "sync"]` — OK?
2. Grace length 7 days and `past_due` keeping features until
   `currentPeriodEnd` — OK?
3. Cancellation keeps access until `currentPeriodEnd` — OK?
4. Entitlement signing with ECDSA P-256 (public key embedded in the desktop) —
   OK?
5. Webhook processing inline (no queue) with a 30 s provider timeout — OK for
   this template?
