import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NoteInputSchema, type Note, type NoteInput } from "@app/shared";

interface NoteEditorProps {
  /** The note being edited, or `null` to create a new one. */
  note: Note | null;
  onCancel: () => void;
  onSubmit: (input: NoteInput) => Promise<void>;
}

export function NoteEditor({ note, onCancel, onSubmit }: NoteEditorProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(): Promise<void> {
    const parsed = NoteInputSchema.safeParse({ title, body });
    if (!parsed.success) {
      setError(t("notes.validationError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(parsed.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={note ? t("notes.edit") : t("notes.new")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <form
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-input bg-background p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="text-lg font-semibold">
          {note ? t("notes.edit") : t("notes.new")}
        </h2>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("notes.fieldTitle")}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            autoFocus
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("notes.fieldBody")}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            maxLength={20_000}
            className="rounded-md border border-input bg-transparent p-3 text-sm"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-input px-4 text-sm"
          >
            {t("notes.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {t("notes.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
