import { createFileRoute } from "@tanstack/react-router";

import { NotesPage } from "@/features/notes";

export const Route = createFileRoute("/_authed/notes")({
  component: NotesPage,
});
