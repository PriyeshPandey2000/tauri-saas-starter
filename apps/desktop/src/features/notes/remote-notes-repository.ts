import { z } from "zod";
import {
  NoteListSchema,
  NoteSchema,
  type Note,
  type NoteInput,
  type NoteList,
  type NoteUpdate,
} from "@app/shared";

import { ports } from "@/ports";
import { getApiClient } from "@/shared/lib/apiClient";
import type { NotePageOptions, NotesRepository } from "./repository-core";

const NoteResponse = z.object({ note: NoteSchema });
const OkResponse = z.object({ ok: z.literal(true) });

/** Notes stored on the API; the server scopes every row to the JWT subject. */
export function createRemoteNotesRepository(): NotesRepository {
  const client = getApiClient();

  /** Kill switch: skip every remote call while `killSwitchSync` is on. */
  function assertSyncEnabled(): void {
    if (ports.featureFlags.get("killSwitchSync")) {
      throw new Error("Remote notes sync is temporarily disabled");
    }
  }

  return {
    async list(options: NotePageOptions = {}): Promise<NoteList> {
      assertSyncEnabled();
      const params = new URLSearchParams();
      if (options.limit) {
        params.set("limit", String(options.limit));
      }
      if (options.before) {
        params.set("before", options.before);
      }
      const query = params.toString();
      return client.request(query ? `/notes?${query}` : "/notes", {
        schema: NoteListSchema,
      });
    },

    async get(id: string): Promise<Note | null> {
      assertSyncEnabled();
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
      assertSyncEnabled();
      const { note } = await client.request("/notes", {
        method: "POST",
        body: input,
        schema: NoteResponse,
      });
      return note;
    },

    async update(id: string, patch: NoteUpdate): Promise<Note> {
      assertSyncEnabled();
      const { note } = await client.request(`/notes/${id}`, {
        method: "PATCH",
        body: patch,
        schema: NoteResponse,
      });
      return note;
    },

    async remove(id: string): Promise<void> {
      assertSyncEnabled();
      await client.request(`/notes/${id}`, {
        method: "DELETE",
        schema: OkResponse,
      });
    },

    async restore(id: string): Promise<Note> {
      assertSyncEnabled();
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
