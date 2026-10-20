import { CreditCard } from "lucide-react";

import { registerNavItem } from "@/shared/lib/nav";

export { useCan, useEntitlement } from "./hooks";
export { useEntitlementStore } from "./entitlement-store";
export { Gate } from "./components/gate";
export { UpgradePrompt } from "./components/upgrade-prompt";
export { PastDueBanner } from "./components/past-due-banner";
export { PricingPage } from "./components/pricing-page";
export { BillingDeepLinkBridge } from "./components/billing-deep-link";

registerNavItem({
  id: "pricing",
  labelKey: "nav.pricing",
  to: "/pricing",
  icon: CreditCard,
  order: 35,
});
