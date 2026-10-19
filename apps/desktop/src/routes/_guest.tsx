import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { initializeAuth, useAuthStore } from "@/features/auth";

export const Route = createFileRoute("/_guest")({
  beforeLoad: async () => {
    await initializeAuth();
    if (useAuthStore.getState().status === "authenticated") {
      throw redirect({ to: "/" });
    }
  },
  component: Outlet,
});
