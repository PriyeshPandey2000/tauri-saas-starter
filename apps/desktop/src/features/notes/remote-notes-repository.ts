import { z } from "zod";
import {
  NoteSchema,
  type Note,
  type NoteInput,
  type NoteUpdate,
} from "@app/shared";

import { getApiClient } from "@/shared/lib/apiClient";
import type { NotesRepository } from "@/shared/lib/repository";

const NoteResponse = z.object({ note: NoteSchema });
const NotesResponse = z.object({ notes: z.array(NoteSchema) });
const OkResponse = z.object({ ok: z.literal(true) });

/** Notes stored on the API; the server scopes every row to the JWT subject. */
export function createRemoteNotesRepository(): NotesRepository {
  const client = getApiClient();

  return {
    async list(): Promise<Note[]> {
      const { notes } = await client.request("/notes", {
        schema: NotesResponse,
      });
      return notes;
    },

    async get(id: string): Promise<Note | null> {
      try {
        const { note } = await client.request(`/notes/${id}`, {
          schema: NoteResponse,
        });
        return note;
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }
    },

    async create(input: NoteInput): Promise<Note> {
      const { note } = await client.request("/notes", {
        method: "POST",
        body: input,
        schema: NoteResponse,
      });
      return note;
    },

    async update(id: string, patch: NoteUpdate): Promise<Note> {
      const { note } = await client.request(`/notes/${id}`, {
        method: "PATCH",
        body: patch,
        schema: NoteResponse,
      });
      return note;
    },

    async remove(id: string): Promise<void> {
      await client.request(`/notes/${id}`, {
        method: "DELETE",
        schema: OkResponse,
      });
    },

    async restore(id: string): Promise<Note> {
      const { note } = await client.request(`/notes/${id}/restore`, {
        method: "POST",
        schema: NoteResponse,
      });
      return note;
    },
  };
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 404
  );
}
