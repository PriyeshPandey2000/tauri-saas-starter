import type { Note, NoteInput, NoteUpdate } from "@app/shared";

/**
 * The only surface the UI uses for notes. A local (SQLite) and a remote (API)
 * implementation sit behind it, so the UI never knows where data lives.
 */
export interface NotesRepository {
  list(): Promise<Note[]>;
  get(id: string): Promise<Note | null>;
  create(input: NoteInput): Promise<Note>;
  update(id: string, patch: NoteUpdate): Promise<Note>;
  remove(id: string): Promise<void>;
  /** Restore a note deleted through {@link remove} (undo). */
  restore(id: string): Promise<Note>;
}
