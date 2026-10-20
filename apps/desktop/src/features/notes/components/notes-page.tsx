import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Note } from "@app/shared";

import {
  useCreateNote,
  useNotes,
  useRemoveNote,
  useRestoreNote,
  useUpdateNote,
} from "../hooks";
import { getConfig } from "@/shared/lib/config";
import { NoteEditor } from "./note-editor";
import { NoteList, NoteSkeleton } from "./note-list";

interface NotesPageProps {
  /** Signed-in user; every query key and repository is scoped to it. */
  userId: string;
  /** True when the remote sync kill switch is on (provided by the route). */
  syncDisabled?: boolean;
}

export function NotesPage({ userId, syncDisabled = false }: NotesPageProps) {
  const { t } = useTranslation();
  const notes = useNotes(userId);
  const createNote = useCreateNote(userId);
  const updateNote = useUpdateNote(userId);
  const removeNote = useRemoveNote(userId);
  const restoreNote = useRestoreNote(userId);
  const remote = getConfig().VITE_NOTES_SOURCE === "remote";
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const items = notes.data?.notes ?? [];

  return (
    <section className="mx-auto flex h-full max-w-3xl flex-col gap-4 p-8">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t("notes.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("notes.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {t("notes.new")}
        </button>
      </header>

      {remote && syncDisabled && (
        <div
          role="status"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {t("notes.syncDisabled")}
        </div>
      )}

      {notes.isPending ? (
        <NoteSkeleton />
      ) : notes.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 p-6 text-center">
          <p className="text-sm text-destructive">{t("notes.loadError")}</p>
          <button
            type="button"
            onClick={() => void notes.refetch()}
            className="rounded-md border border-input px-3 py-1.5 text-sm"
          >
            {t("notes.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-input p-10 text-center text-sm text-muted-foreground">
          {t("notes.empty")}
        </div>
      ) : (
        <NoteList
          notes={items}
          onEdit={setEditing}
          onDelete={(note) => {
            removeNote.mutate(note.id, {
              onSuccess: () =>
                toast(t("notes.deleted"), {
                  action: {
                    label: t("notes.undo"),
                    onClick: () => restoreNote.mutate(note.id),
                  },
                }),
            });
          }}
        />
      )}

      {(creating || editing) && (
        <NoteEditor
          note={editing}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (input) => {
            if (editing) {
              await updateNote.mutateAsync({ id: editing.id, patch: input });
            } else {
              await createNote.mutateAsync(input);
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
