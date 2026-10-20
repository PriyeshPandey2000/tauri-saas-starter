import { z } from "zod";
import {
  BillingPlansResponseSchema,
  CheckoutResponseSchema,
  EntitlementSchema,
  PortalResponseSchema,
  type BillingPlan,
} from "@app/shared";

import type { BillingPort } from "../../BillingPort";
import { getApiClient, ApiError } from "../../../shared/lib/apiClient";

async function openExternal(url: string): Promise<void> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

/** Desktop billing: every call goes to our API, which holds the secrets. */
export function createBillingAdapter(): BillingPort {
  const client = getApiClient();

  return {
    async getEntitlement() {
      try {
        return await client.request("/billing/entitlement", {
          schema: EntitlementSchema,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
          return null;
        }
        throw error;
      }
    },

    async startCheckout(planKey: BillingPlan) {
      const response = await client.request("/billing/checkout", {
        method: "POST",
        body: { planKey },
        schema: CheckoutResponseSchema,
      });
      await openExternal(response.url);
      return response;
    },

    async openPortal() {
      const response = await client.request("/billing/portal", {
        method: "POST",
        schema: PortalResponseSchema,
      });
      await openExternal(response.url);
      return response;
    },

    async getPlans() {
      const response = await client.request("/billing/plans", {
        schema: BillingPlansResponseSchema,
      });
      return response.plans;
    },
  };
}

export const EntitlementResponseSchema = z.object({
  entitlement: EntitlementSchema.nullable(),
});
