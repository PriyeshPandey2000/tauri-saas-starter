import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note, NoteInput, NoteUpdate } from "@app/shared";

import { ports } from "@/ports";
import { useDatabaseStore } from "@/shared/lib/db-status";
import { noteKeys } from "./keys";
import {
  applyOptimisticRemove,
  applyOptimisticUpdate,
  rollback,
} from "./optimistic";
import { createNotesRepository, type NotesRepository } from "./repository";

export { noteKeys } from "./keys";

/** The repository for the current data source, rebuilt when the DB changes. */
export function useNotesRepository(): NotesRepository {
  const phase = useDatabaseStore((state) => state.phase);
  return useMemo(() => {
    // `phase` gates readiness: the local repository needs an open database.
    const db = phase === "ready" ? ports.database.current() : null;
    return createNotesRepository(db);
  }, [phase]);
}

export function useNotes(userId: string) {
  const repository = useNotesRepository();
  return useQuery({
    queryKey: noteKeys.list(userId),
    queryFn: () => repository.list(),
  });
}

export function useCreateNote(userId: string) {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) => repository.create(input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}

export function useUpdateNote(userId: string) {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: NoteUpdate }) =>
      repository.update(id, patch),
    onMutate: (variables) =>
      applyOptimisticUpdate(queryClient, userId, variables.id, variables.patch),
    onError: (_error, _variables, context) =>
      rollback(queryClient, userId, context),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}

export function useRemoveNote(userId: string) {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onMutate: (id) => applyOptimisticRemove(queryClient, userId, id),
    onError: (_error, _id, context) => rollback(queryClient, userId, context),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}

export function useRestoreNote(userId: string) {
  const repository = useNotesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.restore(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}

export type { Note };
export {
  applyOptimisticRemove,
  applyOptimisticUpdate,
  rollback,
  type RollbackContext,
} from "./optimistic";
