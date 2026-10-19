/** Identifier of a purchasable plan. */
export type BillingPlanId = string;

/** What the current user may access. */
export interface Entitlements {
  planId: BillingPlanId | null;
  features: string[];
  active: boolean;
}

/** Billing boundary. Implemented by an adapter in later milestones. */
export interface BillingPort {
  /** Read the current user's entitlements. */
  getEntitlements(): Promise<Entitlements>;
  /** Start checkout for a plan; the adapter opens the external flow. */
  startCheckout(planId: BillingPlanId): Promise<void>;
}
