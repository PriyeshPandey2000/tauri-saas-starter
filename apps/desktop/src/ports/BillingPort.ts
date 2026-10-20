import type {
  BillingPlan,
  CheckoutResponse,
  Entitlement,
  PlanSummary,
  PortalResponse,
} from "@app/shared";

/** Billing boundary. The adapter talks to our API only, never to Dodo. */
export interface BillingPort {
  /** Signed entitlement for the current user, or `null` when billing is off. */
  getEntitlement(): Promise<Entitlement | null>;
  /** Create a checkout session and open it in the system browser. */
  startCheckout(planKey: BillingPlan): Promise<CheckoutResponse>;
  /** Open the provider customer portal in the system browser. */
  openPortal(): Promise<PortalResponse>;
  /** Public plan catalogue (no product ids). */
  getPlans(): Promise<PlanSummary[]>;
}
