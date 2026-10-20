import type { PlanSummary } from "@app/shared";

import type { BillingPort } from "../../BillingPort";

const NO_PLANS: PlanSummary[] = [
  { key: "free", name: "Free", features: [] },
  { key: "pro", name: "Pro", features: ["export", "sync"] },
];

/** Billing adapter with no backend configured. */
export const noopBilling: BillingPort = {
  getEntitlement: () => Promise.resolve(null),
  startCheckout: () => Promise.reject(new Error("Billing is not configured")),
  openPortal: () => Promise.reject(new Error("Billing is not configured")),
  getPlans: () => Promise.resolve(NO_PLANS),
};
