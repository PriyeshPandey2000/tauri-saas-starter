import {
  NoteInputSchema,
  NoteSchema,
  type Note,
  type NoteInput,
  type NoteUpdate,
} from "@app/shared";

import type { NotesRepository } from "./repository";

/** The SQL surface the repository needs; a `DatabasePort` satisfies it. */
export interface Queryable {
  query<T>(
    sql: string,
    params?: (string | number | null | Uint8Array)[],
  ): Promise<T[]>;
  execute(
    sql: string,
    params?: (string | number | null | Uint8Array)[],
  ): Promise<{ rowsAffected: number; lastInsertId?: number }>;
}

interface NoteRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return NoteSchema.parse({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

/** Notes backed by the signed-in user's local SQLite database. */
export function createLocalNotesRepository(db: Queryable): NotesRepository {
  async function findRow(id: string): Promise<NoteRow | null> {
    const rows = await db.query<NoteRow>(
      `SELECT id, title, body, created_at, updated_at
         FROM notes WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  return {
    async list(): Promise<Note[]> {
      const rows = await db.query<NoteRow>(
        `SELECT id, title, body, created_at, updated_at
           FROM notes WHERE deleted_at IS NULL
          ORDER BY updated_at DESC`,
      );
      return rows.map(toNote);
    },

    async get(id: string): Promise<Note | null> {
      const row = await findRow(id);
      return row ? toNote(row) : null;
    },

    async create(input: NoteInput): Promise<Note> {
      const parsed = NoteInputSchema.parse(input);
      const now = new Date().toISOString();
      const note: Note = {
        id: crypto.randomUUID(),
        title: parsed.title,
        body: parsed.body,
        createdAt: now,
        updatedAt: now,
      };
      await db.execute(
        `INSERT INTO notes (id, title, body, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [note.id, note.title, note.body, note.createdAt, note.updatedAt],
      );
      return note;
    },

    async update(id: string, patch: NoteUpdate): Promise<Note> {
      const existing = await findRow(id);
      if (!existing) {
        throw new Error(`Note ${id} not found`);
      }
      const title = NoteInputSchema.shape.title.parse(
        patch.title ?? existing.title,
      );
      const body = patch.body ?? existing.body;
      const updatedAt = new Date().toISOString();
      await db.execute(
        `UPDATE notes SET title = $1, body = $2, updated_at = $3
          WHERE id = $4 AND deleted_at IS NULL`,
        [title, body, updatedAt, id],
      );
      return { ...toNote(existing), title, body, updatedAt };
    },

    async remove(id: string): Promise<void> {
      await db.execute(
        `UPDATE notes SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL`,
        [new Date().toISOString(), id],
      );
    },

    async restore(id: string): Promise<Note> {
      const rows = await db.query<NoteRow>(
        `SELECT id, title, body, created_at, updated_at
           FROM notes WHERE id = $1`,
        [id],
      );
      const row = rows[0];
      if (!row) {
        throw new Error(`Note ${id} not found`);
      }
      await db.execute(`UPDATE notes SET deleted_at = NULL WHERE id = $1`, [
        id,
      ]);
      return toNote(row);
    },
  };
}
