import type { BillingPort, Entitlements } from "../../BillingPort";

const NO_ENTITLEMENTS: Entitlements = {
  planId: null,
  features: [],
  active: false,
};

/** Billing adapter with no plans and no checkout. */
export const noopBilling: BillingPort = {
  getEntitlements(): Promise<Entitlements> {
    return Promise.resolve(NO_ENTITLEMENTS);
  },
  startCheckout(): Promise<void> {
    return Promise.reject(new Error("Billing is not configured yet"));
  },
};
