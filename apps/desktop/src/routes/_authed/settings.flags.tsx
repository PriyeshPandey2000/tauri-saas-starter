import { createFileRoute, redirect } from "@tanstack/react-router";

import { FlagsPage } from "@/features/flags";
import { getConfig } from "@/shared/lib/config";

export const Route = createFileRoute("/_authed/settings/flags")({
  beforeLoad: () => {
    if (getConfig().VITE_APP_ENV === "prod") {
      throw redirect({ to: "/settings" });
    }
  },
  component: FlagsPage,
});
