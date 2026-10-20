import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { DeepLinkBridge } from "@/features/auth";
import "@/features/flags";
import "@/features/notes";
import { useSettingsStore } from "@/features/settings";
import { PortsProvider, ports } from "@/ports";
import { Toaster } from "@/shared/ui/sonner";

import { ErrorBoundary } from "./ErrorBoundary";
import type { AppRouter } from "./router";
import { ThemeProvider } from "./ThemeProvider";
import { WindowThemeSync } from "./WindowThemeSync";

type AppProvidersProps = {
  router: AppRouter;
  queryClient: QueryClient;
};

export function AppProviders({ router, queryClient }: AppProvidersProps) {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <PortsProvider ports={ports}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WindowThemeSync />
            <DeepLinkBridge />
            <RouterProvider router={router} />
            <Toaster theme={theme} />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </PortsProvider>
  );
}
