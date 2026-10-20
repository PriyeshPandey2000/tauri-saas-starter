import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authedRedirect, initializeAuth, useAuthStore } from "@/features/auth";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    await initializeAuth();
    const target = authedRedirect(
      useAuthStore.getState().status,
      location.href,
    );
    if (target) {
      throw redirect(target);
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return <Outlet />;
}
