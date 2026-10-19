import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { initializeAuth, useAuthStore } from "@/features/auth";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    await initializeAuth();
    if (useAuthStore.getState().status !== "authenticated") {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
  },
  component: Outlet,
});
