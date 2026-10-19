import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_guest/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: () => null,
});
