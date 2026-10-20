# Billing

Payments use Dodo Payments as the merchant of record. The API is the only
component that talks to Dodo; the desktop calls our `/billing/*` routes.

## Safety

- `DODO_PAYMENTS_ENVIRONMENT` defaults to `test_mode`. `live_mode` requires
  `NODE_ENV=production` **and** `ALLOW_LIVE_PAYMENTS=true`, or the API refuses to
  start.
- `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY` live only in
  `apps/api/.env`; a pre-commit script rejects key-shaped values. They are never
  in the desktop bundle (checked after build).
- Use test mode cards from the
  [Dodo test payments docs](https://docs.dodopayments.com/developer-resources/test-payments).
  Real test-account runs start only when the reviewer says the test keys are in
  `apps/api/.env`; local webhooks need a tunnel the user sets up.

## Key generation

1. Generate an ECDSA P-256 keypair (PKCS#8 private key, base64):

   ```bash
   openssl ecparam -name prime256v1 -genkey -noout |
     openssl pkcs8 -topk8 -nocrypt -outform DER |
     base64
   ```

2. Put that value in `ENTITLEMENT_SIGNING_KEY` (server env only) and set
   `ENTITLEMENT_SIGNING_KID`.
3. Print the public JWK for the desktop:

   ```bash
   node scripts/print-entitlement-public-key.mjs "$ENTITLEMENT_SIGNING_KEY" k1
   ```

4. Put the printed JSON array in `VITE_ENTITLEMENT_PUBLIC_KEYS` at build time.
   Without it, online entitlement works but offline grace is disabled (the dev
   pricing page warns).

The high-water clock mark is stored in the OS keychain. It deters casual clock
changes only; a determined local attacker controls the machine.

## Plans

`apps/api/src/billing/plans.ts` is the only place that maps a plan key to a
product id and feature list. To add a plan:

1. Add the product in the Dodo dashboard (test mode) and copy its product id.
2. Add the env var (`DODO_PAYMENTS_PRODUCT_<NAME>`) to `apps/api/.env.example`
   and `.env`.
3. Add the key to `plans.ts` with `name`, `features`, and `productId`.
4. Extend `BillingPlanSchema` in `packages/shared/src/billing.ts`.
5. Use the feature string in `useCan("...")` / `<Gate feature="...">` and add
   `requireFeature("...")` to the paid API route.
6. Run `pnpm --filter api db:generate` if the schema changed (it usually does
   not).

## Flow

1. Desktop calls `POST /billing/checkout` with a plan key.
2. The API inserts a `checkout_sessions` row and creates a Dodo checkout.
3. The browser opens; the return URL is the API bounce page
   (`/billing/return`), which links to the parameterless deep link
   `tauri-saas-starter://billing/success`.
4. The app refetches `GET /billing/entitlement` and polls for up to two minutes.
5. Webhooks update `subscriptions` idempotently; the server is the source of
   truth.

## Offline grace

The entitlement response is signed (ECDSA P-256, IEEE P1363). The desktop
verifies the signature, user id, expiry and clock before caching it per user.
Offline use is allowed until `validUntil = min(now + 7d, currentPeriodEnd + 3d)`;
after that the app degrades to free. Sign-out clears the cache.

## Testing

```bash
pnpm --filter api test            # signed local webhooks, PGlite
pnpm --filter api db:migrate      # DATABASE_URL_DIRECT
pnpm --filter desktop build
pnpm --filter desktop verify:bundle-secrets
```

## Known limitations

- Refund and dispute webhooks are logged only; they do not change entitlements.
- Account deletion is blocked while a subscription is active/trialing/past_due.
- The entitlement snapshot cannot prove liveness; it only bounds offline use.
