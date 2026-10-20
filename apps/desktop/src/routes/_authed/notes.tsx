import { createFileRoute } from "@tanstack/react-router";

import { useAuthStore } from "@/features/auth";
import { DatabaseGate, NotesPage } from "@/features/notes";

export const Route = createFileRoute("/_authed/notes")({
  component: NotesRoute,
});

function NotesRoute() {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const signOut = useAuthStore((state) => state.signOut);
  if (!userId) {
    return null;
  }
  return (
    <DatabaseGate userId={userId} onSignOut={() => void signOut()}>
      <NotesPage userId={userId} />
    </DatabaseGate>
  );
}
