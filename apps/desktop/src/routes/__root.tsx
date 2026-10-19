import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { initializeAuth } from "@/features/auth";
import type { RouterContext } from "@/shared/lib/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    await initializeAuth();
  },
  component: () => <Outlet />,
});
