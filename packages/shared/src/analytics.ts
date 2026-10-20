import { z } from "zod";

import { BillingPlanSchema } from "./billing";

/**
 * Explicit, typed analytics events. Snake_case names, no PII in properties.
 * Adding an event: add it here, then call `track` with matching properties.
 */
export const ANALYTICS_EVENTS = {
  app_opened: z.object({}),
  sign_in: z.object({ method: z.enum(["email", "google"]) }),
  sign_out: z.object({}),
  checkout_started: z.object({ plan: BillingPlanSchema }),
  checkout_completed: z.object({ plan: BillingPlanSchema }),
  flag_exposed: z.object({
    flag: z.string().min(1).max(80),
    value: z.union([z.boolean(), z.string().max(64)]),
  }),
} as const;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;
export type AnalyticsProperties<E extends AnalyticsEvent> = z.infer<
  (typeof ANALYTICS_EVENTS)[E]
>;

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return Object.hasOwn(ANALYTICS_EVENTS, value);
}

/** Validate properties at the adapter boundary; throws on a mismatch. */
export function parseAnalyticsProperties<E extends AnalyticsEvent>(
  event: E,
  properties: unknown,
): AnalyticsProperties<E> {
  return ANALYTICS_EVENTS[event].parse(properties) as AnalyticsProperties<E>;
}
