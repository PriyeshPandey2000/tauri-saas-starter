import { z } from "zod";
import { eq } from "drizzle-orm";
import { Webhook } from "standardwebhooks";

import type { Database } from "../db/client";
import type { ApiEnv } from "../env";
import { planForProductId } from "./plans";
import {
  checkoutSessions,
  customers,
  subscriptions,
  user,
  webhookEvents,
} from "../db/schema";

const DodoEventSchema = z
  .object({
    type: z.string().min(1),
    timestamp: z.string().optional(),
    data: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export interface WebhookDeps {
  db: Database;
  env: Pick<
    ApiEnv,
    | "DODO_PAYMENTS_WEBHOOK_KEY"
    | "DODO_PAYMENTS_PRODUCT_PRO"
    | "ENTITLEMENT_SIGNING_KID"
  >;
  now?: () => Date;
  onWarning?: (message: string, context?: unknown) => void;
}

type Status = "active" | "trialing" | "past_due" | "canceled" | "none";

function stringValue(
  data: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function metadataOf(data: Record<string, unknown>): Record<string, unknown> {
  const metadata = data.metadata;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : {};
}

const STATUS_BY_EVENT: Record<string, Status | "ignore"> = {
  "subscription.active": "active",
  "subscription.renewed": "active",
  "subscription.past_due": "past_due",
  "subscription.on_hold": "past_due",
  "subscription.paused": "past_due",
  "subscription.unpaused": "active",
  "subscription.cancelled": "canceled",
  "subscription.expired": "none",
  "subscription.plan_changed": "active",
  "subscription.failed": "ignore",
};

export interface WebhookResult {
  status: 200 | 400 | 401;
  body: Record<string, unknown>;
}

/**
 * Verify and apply a Dodo webhook. The caller passes the raw body; never a
 * re-serialized object. Processing is inline; a thrown error rolls back the
 * idempotency insert so the provider retries.
 */
export async function handleDodoWebhook(
  deps: WebhookDeps,
  rawBody: string,
  headers: Record<string, string | undefined>,
): Promise<WebhookResult> {
  const secret = deps.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!secret) {
    return { status: 400, body: { error: "billing_not_configured" } };
  }
  const webhookId = headers["webhook-id"];
  if (!webhookId) {
    return { status: 401, body: { error: "invalid_signature" } };
  }

  let event: z.infer<typeof DodoEventSchema>;
  try {
    const verified = new Webhook(secret).verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-timestamp": headers["webhook-timestamp"] ?? "",
      "webhook-signature": headers["webhook-signature"] ?? "",
    }) as unknown;
    const parsed = DodoEventSchema.safeParse(verified);
    if (!parsed.success) {
      return { status: 400, body: { error: "invalid_payload" } };
    }
    event = parsed.data;
  } catch {
    return { status: 401, body: { error: "invalid_signature" } };
  }

  const now = deps.now?.() ?? new Date();
  const eventAt = dateValue(event.timestamp) ?? now;
  const data = event.data;
  const providerSubscriptionId = stringValue(data, "subscription_id");
  const providerCustomerId = stringValue(data, "customer_id");
  const metadata = metadataOf(data);
  const metadataUser = stringValue(metadata, "user_id");
  const productId = stringValue(data, "product_id");
  const checkoutSessionId =
    stringValue(data, "checkout_session_id") ?? stringValue(data, "session_id");

  let outcome:
    "duplicate" | "ignored" | "unknown_user" | "stale" | "applied" | "conflict";
  try {
    outcome = await deps.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(webhookEvents)
        .values({ id: webhookId, type: event.type, receivedAt: now })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) {
        return "duplicate" as const;
      }

      // Log-only events (refunds, disputes, unknown types) are acknowledged.
      const nextStatus = STATUS_BY_EVENT[event.type];
      if (nextStatus === undefined) {
        return "ignored" as const;
      }

      // Plans come from the event's product id only; metadata cannot grant one.
      const mappedPlan = planForProductId(deps.env, productId);
      if (!mappedPlan) {
        return "ignored" as const;
      }

      const byProvider = providerSubscriptionId
        ? (
            await tx
              .select()
              .from(subscriptions)
              .where(
                eq(
                  subscriptions.providerSubscriptionId,
                  providerSubscriptionId,
                ),
              )
              .limit(1)
          )[0]
        : undefined;

      if (byProvider && metadataUser && metadataUser !== byProvider.userId) {
        return "ignored" as const;
      }
      let userId = byProvider?.userId;
      const planKey = mappedPlan;

      if (!userId && checkoutSessionId) {
        const [session] = await tx
          .select()
          .from(checkoutSessions)
          .where(eq(checkoutSessions.sessionId, checkoutSessionId))
          .limit(1);
        userId = session?.userId;
      }
      if (!userId && providerCustomerId) {
        const [customer] = await tx
          .select()
          .from(customers)
          .where(eq(customers.providerCustomerId, providerCustomerId))
          .limit(1);
        userId = customer?.userId;
      }
      if (!userId && metadataUser) {
        userId = metadataUser;
      }
      if (!userId) {
        return "unknown_user" as const;
      }

      const [knownUser] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!knownUser) {
        return "unknown_user" as const;
      }

      if (providerCustomerId) {
        await tx
          .insert(customers)
          .values({
            userId,
            providerCustomerId,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: customers.userId,
            set: { providerCustomerId, updatedAt: now },
          });
      }

      if (nextStatus === "ignore" || !providerSubscriptionId) {
        return "ignored" as const;
      }

      // A subscription id already owned by another user is never reassigned.
      const owner = providerSubscriptionId
        ? (
            await tx
              .select({ userId: subscriptions.userId })
              .from(subscriptions)
              .where(
                eq(
                  subscriptions.providerSubscriptionId,
                  providerSubscriptionId,
                ),
              )
              .limit(1)
          )[0]
        : undefined;
      if (owner && owner.userId !== userId) {
        return "ignored" as const;
      }

      // The row that matters is the user's current subscription, regardless of
      // which subscription id this event names.
      const [current] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      const isDifferentSubscription =
        current && current.providerSubscriptionId !== providerSubscriptionId;
      if (
        isDifferentSubscription &&
        event.type !== "subscription.active" &&
        event.type !== "subscription.renewed"
      ) {
        return "ignored" as const;
      }
      if (
        isDifferentSubscription &&
        eventAt.getTime() <= current.providerEventAt.getTime()
      ) {
        return "stale" as const;
      }
      if (
        current &&
        !isDifferentSubscription &&
        eventAt.getTime() < current.providerEventAt.getTime()
      ) {
        return "stale" as const;
      }

      const periodEnd =
        dateValue(data.current_period_end) ?? dateValue(data.next_billing_date);
      const pastDueEnds = dateValue(data.past_due_ends_at);
      const scheduledCancel =
        data.cancel_at_next_billing_date === true ||
        data.cancel_at_period_end === true;

      await tx
        .insert(subscriptions)
        .values({
          userId,
          planKey,
          providerSubscriptionId,
          providerCustomerId:
            providerCustomerId ?? current?.providerCustomerId ?? null,
          status: nextStatus,
          currentPeriodEnd: periodEnd ?? current?.currentPeriodEnd ?? null,
          pastDueEndsAt: pastDueEnds ?? current?.pastDueEndsAt ?? null,
          cancelAtPeriodEnd: scheduledCancel,
          providerEventAt: eventAt,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            planKey,
            providerSubscriptionId,
            providerCustomerId:
              providerCustomerId ?? current?.providerCustomerId ?? null,
            status: nextStatus,
            currentPeriodEnd: periodEnd ?? current?.currentPeriodEnd ?? null,
            pastDueEndsAt: pastDueEnds ?? current?.pastDueEndsAt ?? null,
            cancelAtPeriodEnd: scheduledCancel,
            providerEventAt:
              eventAt.getTime() > (current?.providerEventAt.getTime() ?? 0)
                ? eventAt
                : (current?.providerEventAt ?? eventAt),
            updatedAt: now,
          },
        });

      return "applied" as const;
    });
  } catch (error) {
    // A concurrent delivery that loses the unique race is acknowledged, not a
    // retry loop. Postgres reports 23505; PGlite uses the same code.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
    ) {
      outcome = "conflict";
    } else {
      throw error;
    }
  }

  deps.onWarning?.("Dodo webhook handled", {
    type: event.type,
    outcome,
  });
  return { status: 200, body: { received: true, outcome } };
}
