import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { RouterContext } from "@/shared/lib/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
