import { createFileRoute } from "@tanstack/react-router";

import { PricingPage } from "@/features/billing";

export const Route = createFileRoute("/_authed/pricing")({
  component: PricingPage,
});
