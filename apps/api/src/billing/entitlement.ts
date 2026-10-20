import { createPrivateKey, sign } from "node:crypto";

import {
  canonicalEntitlement,
  type BillingPlan,
  type BillingStatus,
  type Entitlement,
  type EntitlementPayload,
} from "@app/shared";

import type { ApiEnv } from "../env";
import type { Database } from "../db/client";
import { subscriptions } from "../db/schema";
import { eq } from "drizzle-orm";
import { getPlans } from "./plans";

export interface SubscriptionRow {
  userId: string;
  planKey: string;
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  pastDueEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  providerEventAt: Date;
}

const GRACE_DAYS = 7;
const PERIOD_MARGIN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveAccess(
  row: SubscriptionRow | null,
  now = new Date(),
): {
  plan: BillingPlan;
  status: BillingStatus;
  features: string[];
  activeUntil: Date | null;
} {
  if (!row) {
    return { plan: "free", status: "none", features: [], activeUntil: null };
  }
  const status = row.status as BillingStatus;
  const pro = getPlans({ DODO_PAYMENTS_PRODUCT_PRO: "configured" }).pro;

  if (status === "active" || status === "trialing") {
    return {
      plan: "pro",
      status,
      features: pro.features,
      activeUntil: row.currentPeriodEnd,
    };
  }
  if (status === "past_due") {
    const until = row.pastDueEndsAt ?? row.currentPeriodEnd;
    if (until && until.getTime() > now.getTime()) {
      return {
        plan: "pro",
        status,
        features: pro.features,
        activeUntil: until,
      };
    }
    return { plan: "free", status, features: [], activeUntil: until };
  }
  if (status === "canceled") {
    if (
      row.currentPeriodEnd &&
      row.currentPeriodEnd.getTime() > now.getTime()
    ) {
      return {
        plan: "pro",
        status,
        features: pro.features,
        activeUntil: row.currentPeriodEnd,
      };
    }
    return {
      plan: "free",
      status,
      features: [],
      activeUntil: row.currentPeriodEnd,
    };
  }
  return { plan: "free", status: "none", features: [], activeUntil: null };
}

export function buildEntitlementPayload(input: {
  userId: string;
  row: SubscriptionRow | null;
  env: Pick<ApiEnv, "ENTITLEMENT_SIGNING_KID">;
  now: Date;
}): EntitlementPayload {
  const access = resolveAccess(input.row, input.now);
  const issuedAt = input.now;
  const graceEnd = new Date(issuedAt.getTime() + GRACE_DAYS * DAY_MS);
  const periodEnd = access.activeUntil
    ? new Date(access.activeUntil.getTime() + PERIOD_MARGIN_DAYS * DAY_MS)
    : null;
  const validUntil =
    periodEnd && periodEnd.getTime() < graceEnd.getTime()
      ? periodEnd
      : graceEnd;

  return {
    v: 1,
    kid: input.env.ENTITLEMENT_SIGNING_KID,
    userId: input.userId,
    plan: access.plan,
    status: access.status,
    currentPeriodEnd: input.row?.currentPeriodEnd?.toISOString() ?? null,
    features: access.features,
    issuedAt: issuedAt.toISOString(),
    validUntil: validUntil.toISOString(),
  };
}

/** Sign the canonical payload with ECDSA P-256, IEEE P1363 encoding. */
export function signEntitlement(
  payload: EntitlementPayload,
  signingKeyBase64: string,
): Entitlement {
  const key = createPrivateKey({
    key: Buffer.from(signingKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const signature = sign("sha256", Buffer.from(canonicalEntitlement(payload)), {
    key,
    dsaEncoding: "ieee-p1363",
  }).toString("base64");
  return { ...payload, signature };
}

export async function loadCurrentSubscription(
  db: Database,
  userId: string,
): Promise<SubscriptionRow | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function buildSignedEntitlement(input: {
  db: Database;
  userId: string;
  env: Pick<ApiEnv, "ENTITLEMENT_SIGNING_KEY" | "ENTITLEMENT_SIGNING_KID">;
  now?: Date;
}): Promise<Entitlement | null> {
  if (!input.env.ENTITLEMENT_SIGNING_KEY) {
    return null;
  }
  const row = await loadCurrentSubscription(input.db, input.userId);
  const payload = buildEntitlementPayload({
    userId: input.userId,
    row,
    env: input.env,
    now: input.now ?? new Date(),
  });
  return signEntitlement(payload, input.env.ENTITLEMENT_SIGNING_KEY);
}
