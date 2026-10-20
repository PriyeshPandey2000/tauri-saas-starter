import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Note } from "@app/shared";

interface NoteListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteList({ notes, onEdit, onDelete }: NoteListProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual returns unmemoizable functions; the compiler skips this component by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
    // Gives jsdom a viewport so the virtualization test renders real rows.
    initialRect: { width: 800, height: 720 },
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

export function NoteSkeleton() {
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
