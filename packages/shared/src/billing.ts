import { z } from "zod";

export const BillingPlanSchema = z.enum(["free", "pro"]);
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export const BillingStatusSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "none",
]);
export type BillingStatus = z.infer<typeof BillingStatusSchema>;

/** Plan catalogue entry returned by `GET /billing/plans`. */
export const PlanSummarySchema = z.object({
  key: BillingPlanSchema,
  name: z.string().min(1),
  features: z.array(z.string()),
});
export type PlanSummary = z.infer<typeof PlanSummarySchema>;

/**
 * Signed entitlement snapshot. Field order is part of the canonical form:
 * v, kid, userId, plan, status, currentPeriodEnd, features, issuedAt,
 * validUntil. `signature` is the ECDSA P-256 (IEEE P1363) value over the
 * canonical JSON of the other fields.
 */
export const EntitlementPayloadSchema = z.object({
  v: z.literal(1),
  kid: z.string().min(1),
  userId: z.string().min(1),
  plan: BillingPlanSchema,
  status: BillingStatusSchema,
  currentPeriodEnd: z.string().nullable(),
  features: z.array(z.string()),
  issuedAt: z.string().min(1),
  validUntil: z.string().min(1),
});
export type EntitlementPayload = z.infer<typeof EntitlementPayloadSchema>;

export const EntitlementSchema = EntitlementPayloadSchema.extend({
  signature: z.string().min(1),
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

export const CheckoutResponseSchema = z.object({
  url: z.string().url(),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

export const PortalResponseSchema = z.object({
  url: z.string().url(),
});
export type PortalResponse = z.infer<typeof PortalResponseSchema>;

export const BillingPlansResponseSchema = z.object({
  plans: z.array(PlanSummarySchema),
});
export type BillingPlansResponse = z.infer<typeof BillingPlansResponseSchema>;

/** Rebuild the exact bytes the server signs. */
export function canonicalEntitlement(payload: EntitlementPayload): string {
  return JSON.stringify({
    v: payload.v,
    kid: payload.kid,
    userId: payload.userId,
    plan: payload.plan,
    status: payload.status,
    currentPeriodEnd: payload.currentPeriodEnd,
    features: payload.features,
    issuedAt: payload.issuedAt,
    validUntil: payload.validUntil,
  });
}
