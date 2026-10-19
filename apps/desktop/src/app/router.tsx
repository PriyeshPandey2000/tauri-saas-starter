import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import type { RouterContext } from "@/shared/lib/router-context";

import { ErrorFallback } from "./ErrorBoundary";
import { AppShell } from "./layout/AppShell";
import { NotFound } from "./NotFound";
import { routeTree } from "./routeTree.gen";

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient } satisfies RouterContext,
    defaultPreload: "intent",
    scrollRestoration: true,
    InnerWrap: ({ children }) => <AppShell>{children}</AppShell>,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ({ error, reset }) => (
      <ErrorFallback
        error={error instanceof Error ? error : new Error(String(error))}
        reset={reset}
      />
    ),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
