import type { QueryClient } from "@tanstack/react-query";
import type { NoteList, NoteUpdate } from "@app/shared";

import { noteKeys } from "./keys";

export interface RollbackContext {
  previous?: NoteList;
}

export async function applyOptimisticUpdate(
  queryClient: QueryClient,
  userId: string,
  id: string,
  patch: NoteUpdate,
): Promise<RollbackContext> {
  const key = noteKeys.list(userId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<NoteList>(key);
  queryClient.setQueryData<NoteList>(key, (page) =>
    page
      ? {
          ...page,
          notes: page.notes.map((note) =>
            note.id === id ? { ...note, ...patch } : note,
          ),
        }
      : page,
  );
  return { previous };
}

export async function applyOptimisticRemove(
  queryClient: QueryClient,
  userId: string,
  id: string,
): Promise<RollbackContext> {
  const key = noteKeys.list(userId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<NoteList>(key);
  queryClient.setQueryData<NoteList>(key, (page) =>
    page
      ? { ...page, notes: page.notes.filter((note) => note.id !== id) }
      : page,
  );
  return { previous };
}

export function rollback(
  queryClient: QueryClient,
  userId: string,
  context: RollbackContext | undefined,
): void {
  if (context?.previous) {
    queryClient.setQueryData(noteKeys.list(userId), context.previous);
  }
}
