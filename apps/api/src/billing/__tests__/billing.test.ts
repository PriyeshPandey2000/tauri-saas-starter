import { generateKeyPairSync, verify } from "node:crypto";

import { Hono } from "hono";
import { Webhook } from "standardwebhooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalEntitlement, type EntitlementPayload } from "@app/shared";

import { createApp } from "../../app";
import { createAuth } from "../../auth/auth";
import type { AuthVariables } from "../../auth/require-auth";
import { createTestDb, resetTestDb } from "../../db/test-db";
import * as schema from "../../db/schema";
import { loadEnv, ApiEnvError, type ApiEnv } from "../../env";
import {
  buildEntitlementPayload,
  resolveAccess,
  signEntitlement,
  type SubscriptionRow,
} from "../entitlement";
import { createRequireFeature } from "../require-feature";
import { registerBillingRoutes } from "../routes";

const WEBHOOK_SECRET = `whsec_${Buffer.from("local-test-secret").toString("base64")}`;
const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const SIGNING_KEY = privateKey
  .export({ type: "pkcs8", format: "der" })
  .toString("base64");

const baseEnv: ApiEnv = {
  NODE_ENV: "test",
  PORT: 8787,
  DATABASE_URL: "postgres://user:pass@localhost:5432/app",
  DATABASE_URL_DIRECT: "postgres://user:pass@localhost:5432/app",
  DATABASE_POOL_MAX: 5,
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://127.0.0.1:8799",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  APP_DEEP_LINK_SCHEME: "tauri-saas-starter",
  AUTH_REQUIRE_EMAIL_VERIFICATION: false,
  DODO_PAYMENTS_ENVIRONMENT: "test_mode",
  ENTITLEMENT_SIGNING_KID: "k1",
  DODO_PAYMENTS_WEBHOOK_KEY: WEBHOOK_SECRET,
  ENTITLEMENT_SIGNING_KEY: SIGNING_KEY,
  DODO_PAYMENTS_PRODUCT_PRO: "prod_test",
  DODO_PAYMENTS_API_KEY: "dodo_test_key",
};

function signWebhook(id: string, payload: unknown): Record<string, string> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = new Webhook(WEBHOOK_SECRET).sign(
    id,
    new Date(timestamp * 1000),
    body,
  );
  return {
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": signature,
  };
}

function event(
  type: string,
  data: Record<string, unknown>,
  timestamp = new Date().toISOString(),
) {
  return { type, timestamp, data };
}

async function createUser(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  id: string,
) {
  const now = new Date();
  await db.insert(schema.user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function postWebhook(
  app: ReturnType<typeof createApp>,
  id: string,
  payload: unknown,
) {
  const body = JSON.stringify(payload);
  return app.request("/webhooks/dodo", {
    method: "POST",
    headers: {
      ...signWebhook(id, payload),
      "content-type": "application/json",
      origin: "tauri://localhost",
    },
    body,
  });
}

describe("payments safety", () => {
  const minimal = {
    DATABASE_URL: "postgres://u:p@localhost:5432/app",
    DATABASE_URL_DIRECT: "postgres://u:p@localhost:5432/app",
    BETTER_AUTH_SECRET: "x".repeat(32),
    BETTER_AUTH_URL: "http://127.0.0.1:8787",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
  };

  it("defaults to test mode", () => {
    expect(loadEnv(minimal).DODO_PAYMENTS_ENVIRONMENT).toBe("test_mode");
  });

  it("refuses live mode outside production", () => {
    expect(() =>
      loadEnv({
        ...minimal,
        DODO_PAYMENTS_ENVIRONMENT: "live_mode",
        ALLOW_LIVE_PAYMENTS: "true",
      }),
    ).toThrow(ApiEnvError);
  });

  it("refuses live mode without the explicit flag", () => {
    try {
      loadEnv({
        ...minimal,
        NODE_ENV: "production",
        DODO_PAYMENTS_ENVIRONMENT: "live_mode",
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiEnvError);
      expect((error as ApiEnvError).issues.join(" ")).toContain(
        "ALLOW_LIVE_PAYMENTS",
      );
    }
  });

  it("accepts live mode only with production and the flag", () => {
    expect(
      loadEnv({
        ...minimal,
        NODE_ENV: "production",
        DODO_PAYMENTS_ENVIRONMENT: "live_mode",
        ALLOW_LIVE_PAYMENTS: "true",
      }).DODO_PAYMENTS_ENVIRONMENT,
    ).toBe("live_mode");
  });
});

describe("entitlements", () => {
  function row(overrides: Partial<SubscriptionRow>): SubscriptionRow {
    return {
      userId: "u1",
      planKey: "pro",
      providerSubscriptionId: "sub_1",
      providerCustomerId: "cus_1",
      status: "active",
      currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
      pastDueEndsAt: null,
      cancelAtPeriodEnd: false,
      providerEventAt: new Date("2026-10-01T00:00:00.000Z"),
      ...overrides,
    };
  }

  it("keeps access until the period end after cancellation", () => {
    const access = resolveAccess(
      row({ status: "canceled" }),
      new Date("2026-10-20T00:00:00.000Z"),
    );
    expect(access.features).toContain("export");
  });

  it("downgrades an active subscription whose period ended over 3 days ago", () => {
    const access = resolveAccess(
      row({
        status: "active",
        currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"),
      }),
      new Date("2026-10-20T00:00:00.000Z"),
    );
    expect(access.plan).toBe("free");
    expect(access.features).toEqual([]);
  });

  it("downgrades an active subscription with no period end and an old event", () => {
    const access = resolveAccess(
      row({
        status: "active",
        currentPeriodEnd: null,
        providerEventAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
      new Date("2026-10-20T00:00:00.000Z"),
    );
    expect(access.plan).toBe("free");
  });

  it("downgrades after the grace deadline", () => {
    const access = resolveAccess(
      row({
        status: "past_due",
        pastDueEndsAt: new Date("2026-10-15T00:00:00.000Z"),
      }),
      new Date("2026-10-20T00:00:00.000Z"),
    );
    expect(access.plan).toBe("free");
    expect(access.features).toEqual([]);
  });

  it("signs a canonical payload that verifies and rejects tampering", () => {
    const payload = buildEntitlementPayload({
      userId: "u1",
      row: row({}),
      env: { ENTITLEMENT_SIGNING_KID: "k1" },
      now: new Date("2026-10-20T00:00:00.000Z"),
    });
    const signed = signEntitlement(payload, SIGNING_KEY);
    const data = Buffer.from(canonicalEntitlement(payload));
    expect(
      verify(
        "sha256",
        data,
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(signed.signature, "base64"),
      ),
    ).toBe(true);

    const tampered: EntitlementPayload = {
      ...payload,
      features: [...payload.features, "admin"],
    };
    expect(
      verify(
        "sha256",
        Buffer.from(canonicalEntitlement(tampered)),
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(signed.signature, "base64"),
      ),
    ).toBe(false);
  });
});

describe("webhooks and paid routes (real app + PGlite)", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const created = await createTestDb();
    db = created.db;
    await resetTestDb(created.client);
    const auth = createAuth({
      db,
      env: baseEnv,
      mailer: { send: vi.fn(async () => undefined) },
    });
    app = createApp({ auth, env: baseEnv, db });
    await createUser(db, "user-a");
    await createUser(db, "user-b");
  });

  it("rejects tampered bodies, wrong secret, stale timestamps and missing headers", async () => {
    const payload = event("subscription.active", {
      subscription_id: "sub_1",
      product_id: "prod_test",
      customer_id: "cus_1",
      metadata: { user_id: "user-a", plan_key: "pro" },
    });
    const body = JSON.stringify(payload);
    const headers = signWebhook("evt_1", payload);

    const tampered = await app.request("/webhooks/dodo", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: body.replace("user-a", "user-b"),
    });
    expect(tampered.status).toBe(401);

    const wrongSecret = new Webhook(
      `whsec_${Buffer.from("other-secret").toString("base64")}`,
    ).sign("evt_2", new Date(), body);
    const wrong = await app.request("/webhooks/dodo", {
      method: "POST",
      headers: {
        "webhook-id": "evt_2",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "webhook-signature": wrongSecret,
        "content-type": "application/json",
      },
      body,
    });
    expect(wrong.status).toBe(401);

    const stale = new Webhook(WEBHOOK_SECRET).sign(
      "evt_3",
      new Date(Date.now() - 3_600_000),
      body,
    );
    const staleResponse = await app.request("/webhooks/dodo", {
      method: "POST",
      headers: {
        "webhook-id": "evt_3",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000) - 3600),
        "webhook-signature": stale,
        "content-type": "application/json",
      },
      body,
    });
    expect(staleResponse.status).toBe(401);

    const missing = await app.request("/webhooks/dodo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    expect(missing.status).toBe(401);
  });

  it("applies a subscription once and is idempotent", async () => {
    const payload = event("subscription.active", {
      subscription_id: "sub_1",
      product_id: "prod_test",
      customer_id: "cus_1",
      next_billing_date: "2026-11-20T00:00:00.000Z",
      metadata: { user_id: "user-a", plan_key: "pro" },
    });

    const first = await postWebhook(app, "evt_active", payload);
    expect(first.status).toBe(200);
    const second = await postWebhook(app, "evt_active", payload);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      outcome: "duplicate",
    });

    const rows = await db.select().from(schema.subscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("active");
    const events = await db.select().from(schema.webhookEvents);
    expect(events).toHaveLength(1);
  });

  it("applies transitions and ignores a late event for an old subscription", async () => {
    await postWebhook(
      app,
      "evt_1",
      event("subscription.active", {
        subscription_id: "sub_1",
        product_id: "prod_test",
        next_billing_date: "2026-11-01T00:00:00.000Z",
        metadata: { user_id: "user-a", plan_key: "pro" },
      }),
    );
    await postWebhook(
      app,
      "evt_2",
      event(
        "subscription.cancelled",
        {
          subscription_id: "sub_1",
          product_id: "prod_test",
          customer_id: "cus_1",
          metadata: { user_id: "user-a", plan_key: "pro" },
        },
        new Date(Date.now() + 1000).toISOString(),
      ),
    );
    await postWebhook(
      app,
      "evt_3",
      event(
        "subscription.active",
        {
          subscription_id: "sub_1",
          product_id: "prod_test",
          metadata: { user_id: "user-a", plan_key: "pro" },
        },
        new Date(Date.now() - 60_000).toISOString(),
      ),
    );
    const [row] = await db.select().from(schema.subscriptions);
    expect(row?.status).toBe("canceled");

    const applied = await postWebhook(
      app,
      "evt_4",
      event(
        "subscription.active",
        {
          subscription_id: "sub_2",
          product_id: "prod_test",
          next_billing_date: "2026-12-01T00:00:00.000Z",
          metadata: { user_id: "user-a", plan_key: "pro" },
        },
        new Date(Date.now() + 2000).toISOString(),
      ),
    );
    expect(await applied.json()).toMatchObject({ outcome: "applied" });
    await postWebhook(
      app,
      "evt_5",
      event(
        "subscription.expired",
        {
          subscription_id: "sub_1",
          product_id: "prod_test",
          metadata: { user_id: "user-a" },
        },
        new Date(Date.now() + 3000).toISOString(),
      ),
    );
    const [current] = await db.select().from(schema.subscriptions);
    expect(current?.providerSubscriptionId).toBe("sub_2");
    expect(current?.status).toBe("active");
  });

  it("acknowledges unknown users and unknown events without entitlement changes", async () => {
    const unknownUser = await postWebhook(
      app,
      "evt_ghost",
      event("subscription.active", {
        subscription_id: "sub_x",
        product_id: "prod_test",
        metadata: { user_id: "no-such-user" },
      }),
    );
    expect(unknownUser.status).toBe(200);
    await expect(unknownUser.json()).resolves.toMatchObject({
      outcome: "unknown_user",
    });

    const unknownType = await postWebhook(
      app,
      "evt_other",
      event("refund.succeeded", {
        subscription_id: "sub_1",
        product_id: "prod_test",
        metadata: { user_id: "user-a" },
      }),
    );
    expect(unknownType.status).toBe(200);
    expect(await db.select().from(schema.subscriptions)).toHaveLength(0);
  });

  it("requires auth on the billing routes", async () => {
    const response = await app.request("/billing/plans", {
      headers: { origin: "tauri://localhost" },
    });
    expect(response.status).toBe(401);
  });

  it("blocks account deletion while a subscription can still bill", async () => {
    const { assertAccountDeletable } = await import("../guard");
    await db.insert(schema.subscriptions).values({
      userId: "user-b",
      planKey: "pro",
      providerSubscriptionId: "sub_block",
      providerCustomerId: null,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      pastDueEndsAt: null,
      cancelAtPeriodEnd: false,
      providerEventAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(assertAccountDeletable(db, "user-b")).rejects.toThrow(
      /Cancel your subscription/,
    );
    await expect(assertAccountDeletable(db, "user-a")).resolves.toBeUndefined();
  });

  it("derives the plan from the product id and ignores unknown products", async () => {
    const unknown = await postWebhook(
      app,
      "evt_unknown_product",
      event("subscription.active", {
        subscription_id: "sub_unknown",
        product_id: "prod_other_app",
        metadata: { user_id: "user-a", plan_key: "pro" },
      }),
    );
    expect(unknown.status).toBe(200);
    await expect(unknown.json()).resolves.toMatchObject({ outcome: "ignored" });
    expect(await db.select().from(schema.subscriptions)).toHaveLength(0);

    const spoofed = await postWebhook(
      app,
      "evt_spoofed_plan",
      event("subscription.active", {
        subscription_id: "sub_spoof",
        product_id: "prod_test",
        metadata: { user_id: "user-a", plan_key: "free" },
      }),
    );
    expect(spoofed.status).toBe(200);
    const [row] = await db.select().from(schema.subscriptions);
    expect(row?.planKey).toBe("pro");
  });

  it("updates the plan on plan_changed by product id", async () => {
    await postWebhook(
      app,
      "evt_plan_1",
      event("subscription.active", {
        subscription_id: "sub_plan",
        product_id: "prod_test",
        metadata: { user_id: "user-a" },
      }),
    );
    await postWebhook(
      app,
      "evt_plan_2",
      event(
        "subscription.plan_changed",
        {
          subscription_id: "sub_plan",
          product_id: "prod_test",
          metadata: { user_id: "user-a" },
        },
        new Date(Date.now() + 1000).toISOString(),
      ),
    );
    const [row] = await db.select().from(schema.subscriptions);
    expect(row?.planKey).toBe("pro");
  });

  it("ignores a subscription id that already belongs to another user", async () => {
    await postWebhook(
      app,
      "evt_owner",
      event("subscription.active", {
        subscription_id: "sub_owned",
        product_id: "prod_test",
        metadata: { user_id: "user-b" },
      }),
    );
    const collision = await postWebhook(
      app,
      "evt_collision",
      event(
        "subscription.active",
        {
          subscription_id: "sub_owned",
          product_id: "prod_test",
          metadata: { user_id: "user-a" },
        },
        new Date(Date.now() + 1000).toISOString(),
      ),
    );
    await expect(collision.json()).resolves.toMatchObject({
      outcome: "ignored",
    });
    const rows = await db.select().from(schema.subscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe("user-b");
  });

  it("rejects bodies over 1 MB before verification", async () => {
    const response = await app.request("/webhooks/dodo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "tauri://localhost",
      },
      body: "x".repeat(1_048_577),
    });
    expect(response.status).toBe(413);
  });

  it("returns 409 for a past_due user starting checkout", async () => {
    await db.insert(schema.subscriptions).values({
      userId: "user-a",
      planKey: "pro",
      providerSubscriptionId: "sub_past",
      providerCustomerId: null,
      status: "past_due",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      pastDueEndsAt: new Date(Date.now() + 86_400_000),
      cancelAtPeriodEnd: false,
      providerEventAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const gate = new Hono<{ Variables: AuthVariables }>();
    gate.use("*", async (c, next) => {
      c.set("claims", { sub: "user-a" });
      await next();
    });
    registerBillingRoutes(gate, { db, env: baseEnv, now: () => new Date() });
    const response = await gate.request("/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey: "pro" }),
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      hint: "open_portal",
    });
  });

  it("enforces requireFeature server-side", async () => {
    const gate = new Hono<{ Variables: AuthVariables }>();
    gate.use("*", async (c, next) => {
      c.set("claims", { sub: "user-b" });
      await next();
    });
    gate.get("/paid", createRequireFeature(db)("export"), (c) =>
      c.json({ ok: true }),
    );

    const denied = await gate.request("/paid");
    expect(denied.status).toBe(403);

    await db.insert(schema.subscriptions).values({
      userId: "user-b",
      planKey: "pro",
      providerSubscriptionId: "sub_b",
      providerCustomerId: null,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      pastDueEndsAt: null,
      cancelAtPeriodEnd: false,
      providerEventAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const allowed = await gate.request("/paid");
    expect(allowed.status).toBe(200);
  });
});
