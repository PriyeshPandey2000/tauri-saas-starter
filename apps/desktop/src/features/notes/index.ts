import { NotebookPen } from "lucide-react";

import { registerNavItem } from "@/shared/lib/nav";

export { NotesPage } from "./components/notes-page";
export { DatabaseGate } from "./components/database-gate";
export {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useRemoveNote,
  useRestoreNote,
  useNotesRepository,
  noteKeys,
} from "./hooks";
export { createNotesRepository } from "./repository";
export type { NotesRepository } from "./repository";

registerNavItem({
  id: "notes",
  labelKey: "nav.notes",
  to: "/notes",
  icon: NotebookPen,
  order: 10,
});
