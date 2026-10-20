import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authedRedirect, initializeAuth, useAuthStore } from "@/features/auth";
import { DatabaseGate } from "@/features/notes";

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
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  return (
    <DatabaseGate userId={userId}>
      <Outlet />
    </DatabaseGate>
  );
}
