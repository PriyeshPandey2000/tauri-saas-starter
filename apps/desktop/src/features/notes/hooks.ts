import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { Note, NoteInput, NoteUpdate } from "@app/shared";

import { ports } from "@/ports";
import { useDatabaseStore } from "@/shared/lib/db-status";
import { createNotesRepository, type NotesRepository } from "./repository";

export const noteKeys = {
  all: ["notes"] as const,
  list: () => [...noteKeys.all, "list"] as const,
  detail: (id: string) => [...noteKeys.all, "detail", id] as const,
};

/** The repository for the current data source, rebuilt when the DB changes. */
export function useNotesRepository(): NotesRepository {
  const phase = useDatabaseStore((state) => state.phase);
  return useMemo(() => {
    // `phase` gates readiness: the local repository needs an open database.
    const db = phase === "ready" ? ports.database.current() : null;
    return createNotesRepository(db);
  }, [phase]);
}

export function useNotes() {
  const repository = useNotesRepository();
  return useQuery({
    queryKey: noteKeys.list(),
    queryFn: () => repository.list(),
  });
}

export function useCreateNote() {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) => repository.create(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useUpdateNote() {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: NoteUpdate }) =>
      repository.update(id, patch),
    onMutate: (variables) =>
      applyOptimisticUpdate(queryClient, variables.id, variables.patch),
    onError: (_error, _variables, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useRemoveNote() {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.list() });
      const previous = queryClient.getQueryData<Note[]>(noteKeys.list());
      queryClient.setQueryData<Note[]>(noteKeys.list(), (notes) =>
        (notes ?? []).filter((note) => note.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useRestoreNote() {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.restore(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

interface RollbackContext {
  previous?: Note[];
}

async function applyOptimisticUpdate(
  queryClient: QueryClient,
  id: string,
  patch: NoteUpdate,
): Promise<RollbackContext> {
  await queryClient.cancelQueries({ queryKey: noteKeys.list() });
  const previous = queryClient.getQueryData<Note[]>(noteKeys.list());
  queryClient.setQueryData<Note[]>(noteKeys.list(), (notes) =>
    (notes ?? []).map((note) =>
      note.id === id ? { ...note, ...patch } : note,
    ),
  );
  return { previous };
}

function rollback(
  queryClient: QueryClient,
  context: RollbackContext | undefined,
): void {
  if (context?.previous) {
    queryClient.setQueryData(noteKeys.list(), context.previous);
  }
}
