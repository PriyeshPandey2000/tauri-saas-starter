import { createFileRoute, redirect } from "@tanstack/react-router";

import { BetaExportPage } from "@/features/flags";
import { ports } from "@/ports";

export const Route = createFileRoute("/_authed/beta-export")({
  beforeLoad: () => {
    // Non-React access: route gating reads the in-memory snapshot, no network.
    if (!ports.featureFlags.get("betaExport")) {
      throw redirect({ to: "/" });
    }
  },
  component: BetaExportPage,
});
