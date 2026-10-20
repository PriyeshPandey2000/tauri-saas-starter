import type { PlanSummary } from "@app/shared";

import type { ApiEnv } from "../env";

export type BillingPlanKey = "free" | "pro";

export interface PlanConfig {
  key: BillingPlanKey;
  name: string;
  features: string[];
  productId: string | null;
}

/**
 * The only place provider product ids are mapped to plans. Routes and the
 * desktop send a plan key, never a product id.
 */
export function getPlans(
  env: Pick<ApiEnv, "DODO_PAYMENTS_PRODUCT_PRO">,
): Record<BillingPlanKey, PlanConfig> {
  return {
    free: { key: "free", name: "Free", features: [], productId: null },
    pro: {
      key: "pro",
      name: "Pro",
      features: ["export", "sync"],
      productId: env.DODO_PAYMENTS_PRODUCT_PRO ?? null,
    },
  };
}

export function planSummaries(
  env: Pick<ApiEnv, "DODO_PAYMENTS_PRODUCT_PRO">,
): PlanSummary[] {
  return Object.values(getPlans(env)).map(({ key, name, features }) => ({
    key,
    name,
    features,
  }));
}

export function isPlanKey(value: string): value is BillingPlanKey {
  return value === "free" || value === "pro";
}
