import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { guestRedirect, initializeAuth, useAuthStore } from "@/features/auth";

export const Route = createFileRoute("/_guest")({
  beforeLoad: async () => {
    await initializeAuth();
    const target = guestRedirect(useAuthStore.getState().status);
    if (target) {
      throw redirect(target);
    }
  },
  component: Outlet,
});
