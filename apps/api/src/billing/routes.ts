import type { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";

import {
  BillingPlanSchema,
  BillingPlansResponseSchema,
  CheckoutResponseSchema,
  EntitlementSchema,
  PortalResponseSchema,
} from "@app/shared";

import type { AuthVariables } from "../auth/require-auth";
import type { Database } from "../db/client";
import { dodoApiBaseUrl, type ApiEnv } from "../env";
import { checkoutSessions, customers, user } from "../db/schema";
import {
  buildSignedEntitlement,
  loadCurrentSubscription,
  resolveAccess,
} from "./entitlement";
import { getPlans, isPlanKey, planSummaries } from "./plans";
import { createRequireFeature } from "./require-feature";

const CheckoutBodySchema = z.object({ planKey: BillingPlanSchema });

export interface BillingRouteOptions {
  db: Database;
  env: ApiEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function providerConfigured(env: ApiEnv): boolean {
  return Boolean(
    env.DODO_PAYMENTS_API_KEY &&
    env.DODO_PAYMENTS_PRODUCT_PRO &&
    env.ENTITLEMENT_SIGNING_KEY,
  );
}

async function providerRequest(
  options: BillingRouteOptions,
  path: string,
  body?: unknown,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetchImpl(`${dodoApiBaseUrl(options.env)}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.env.DODO_PAYMENTS_API_KEY}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Rendered on the provider return URL; carries no authority. */
export function billingReturnPage(deepLink: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Payment finished</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center}a{display:inline-block;margin-top:1rem;padding:.6rem 1rem;border:1px solid #ccc;border-radius:.4rem;text-decoration:none;color:inherit}</style>
</head><body><h1>Payment finished</h1><p>Return to the app to see your plan.</p>
<a href="${deepLink}">Return to the app</a></body></html>`;
}

export function registerBillingRoutes(
  app: Hono<{ Variables: AuthVariables }>,
  options: BillingRouteOptions,
): void {
  const { db, env } = options;
  const now = options.now ?? (() => new Date());

  app.get("/billing/plans", (c) => {
    return c.json(
      BillingPlansResponseSchema.parse({ plans: planSummaries(env) }),
    );
  });

  app.get("/billing/entitlement", async (c) => {
    const userId = c.get("claims").sub;
    if (typeof userId !== "string" || !userId) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const entitlement = await buildSignedEntitlement({
      db,
      userId,
      env,
      now: now(),
    });
    if (!entitlement) {
      return c.json({ error: "billing_unavailable" }, 503);
    }
    return c.json(EntitlementSchema.parse(entitlement));
  });

  app.post("/billing/checkout", async (c) => {
    const userId = c.get("claims").sub;
    if (typeof userId !== "string" || !userId) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const parsed = CheckoutBodySchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success || !isPlanKey(parsed.data.planKey)) {
      return c.json({ error: "invalid_plan" }, 400);
    }
    if (!providerConfigured(env)) {
      return c.json({ error: "billing_unavailable" }, 503);
    }
    const plan = getPlans(env)[parsed.data.planKey];
    if (!plan.productId) {
      return c.json({ error: "plan_unavailable" }, 400);
    }
    const current = await loadCurrentSubscription(db, userId);
    const access = resolveAccess(current);
    if (access.status === "active" || access.status === "trialing") {
      return c.json({ error: "already_subscribed", hint: "open_portal" }, 409);
    }
    const [account] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!account) {
      return c.json({ error: "unknown_user" }, 404);
    }

    const returnUrl = `${env.API_PUBLIC_URL ?? env.BETTER_AUTH_URL}/billing/return`;
    const response = await providerRequest(options, "/checkouts", {
      product_cart: [{ product_id: plan.productId, quantity: 1 }],
      customer: { email: account.email },
      return_url: returnUrl,
      metadata: { user_id: userId, plan_key: plan.key },
    });
    const payload = (await response.json().catch(() => null)) as {
      checkout_url?: string | null;
      session_id?: string;
    } | null;
    if (!response.ok || !payload?.checkout_url || !payload.session_id) {
      return c.json({ error: "provider_error" }, 502);
    }

    await db
      .insert(checkoutSessions)
      .values({
        sessionId: payload.session_id,
        userId,
        planKey: plan.key,
        createdAt: now(),
      })
      .onConflictDoNothing();

    return c.json(CheckoutResponseSchema.parse({ url: payload.checkout_url }));
  });

  app.post("/billing/portal", async (c) => {
    const userId = c.get("claims").sub;
    if (typeof userId !== "string" || !userId) {
      return c.json({ error: "unauthorized" }, 401);
    }
    if (!providerConfigured(env)) {
      return c.json({ error: "billing_unavailable" }, 503);
    }
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);
    if (!customer) {
      return c.json({ error: "no_customer" }, 404);
    }
    const response = await providerRequest(
      options,
      `/customers/${encodeURIComponent(customer.providerCustomerId)}/customer-portal/session`,
      {},
    );
    const payload = (await response.json().catch(() => null)) as {
      link?: string;
    } | null;
    if (!response.ok || !payload?.link) {
      return c.json({ error: "provider_error" }, 502);
    }
    return c.json(PortalResponseSchema.parse({ url: payload.link }));
  });

  app.get("/billing/paid-example", createRequireFeature(db)("export"), (c) =>
    c.json({ ok: true }),
  );
}

/** Public bounce page: registered before the auth middleware on purpose. */
export function registerBillingReturnRoute(
  app: Hono<{ Variables: AuthVariables }>,
  env: Pick<ApiEnv, "APP_DEEP_LINK_SCHEME">,
): void {
  app.get("/billing/return", (c) =>
    c.html(billingReturnPage(`${env.APP_DEEP_LINK_SCHEME}://billing/success`)),
  );
}
