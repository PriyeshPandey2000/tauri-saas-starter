import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import type { Note } from "@app/shared";

import {
  useCreateNote,
  useNotes,
  useRemoveNote,
  useRestoreNote,
  useUpdateNote,
} from "../hooks";
import { NoteEditor } from "./note-editor";

export function NotesPage() {
  const { t } = useTranslation();
  const notes = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const removeNote = useRemoveNote();
  const restoreNote = useRestoreNote();
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const items = notes.data ?? [];

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

interface NoteListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

function NoteList({ notes, onEdit, onDelete }: NoteListProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual returns unmemoizable functions; the compiler skips this component by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <ul
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const note = notes[virtualRow.index];
          if (!note) {
            return null;
          }
          return (
            <li
              key={note.id}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div className="mb-2 flex items-start justify-between gap-3 rounded-md border border-input p-4">
                <button
                  type="button"
                  onClick={() => onEdit(note)}
                  className="flex flex-1 flex-col gap-1 text-left"
                >
                  <span className="font-medium">{note.title}</span>
                  {note.body && (
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {note.body}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(note)}
                  aria-label={t("notes.delete")}
                  className="rounded-md border border-input px-2 py-1 text-xs text-muted-foreground"
                >
                  {t("notes.delete")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NoteSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-md border border-input bg-muted/40"
        />
      ))}
    </div>
  );
}
