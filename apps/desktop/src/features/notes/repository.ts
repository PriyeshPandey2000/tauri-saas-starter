import type { DatabasePort } from "@/ports";
import type { NotesRepository } from "./repository-core";
import { getConfig } from "@/shared/lib/config";
import { createLocalNotesRepository } from "./local-notes-repository";
import { createRemoteNotesRepository } from "./remote-notes-repository";

export type { NotesRepository } from "./repository-core";

/**
 * Pick the notes backend. Local SQLite is the default so the app works
 * offline; set `VITE_NOTES_SOURCE=remote` to use the API instead.
 */
export function createNotesRepository(
  db: DatabasePort | null,
): NotesRepository {
  if (getConfig().VITE_NOTES_SOURCE === "remote") {
    return createRemoteNotesRepository();
  }
  if (!db) {
    throw new Error("The local database is not open yet");
  }
  return createLocalNotesRepository(db);
}
