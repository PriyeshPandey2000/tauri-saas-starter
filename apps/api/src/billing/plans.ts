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

/** The only product-id -> plan mapping. Unknown products return `null`. */
export function planForProductId(
  env: Pick<ApiEnv, "DODO_PAYMENTS_PRODUCT_PRO">,
  productId: string | undefined,
): BillingPlanKey | null {
  if (!productId) {
    return null;
  }
  for (const [key, plan] of Object.entries(getPlans(env))) {
    if (plan.productId === productId && isPlanKey(key)) {
      return key;
    }
  }
  return null;
}
