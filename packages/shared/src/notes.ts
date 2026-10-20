import { z } from "zod";

/** A note as stored locally and returned by the API. */
export const NoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(20_000).default(""),
  /** ISO-8601 creation time. */
  createdAt: z.string().min(1),
  /** ISO-8601 last-update time. */
  updatedAt: z.string().min(1),
});

export const NoteInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20_000).default(""),
});

export const NoteUpdateSchema = NoteInputSchema.partial();

/** Default and maximum page size for `GET /notes`. */
export const NOTE_PAGE_DEFAULT = 50;
export const NOTE_PAGE_MAX = 200;

/** One page of notes plus the cursor for the next (older) page. */
export const NoteListSchema = z.object({
  notes: z.array(NoteSchema),
  nextCursor: z.string().nullable().default(null),
});

export type Note = z.infer<typeof NoteSchema>;
export type NoteInput = z.infer<typeof NoteInputSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NoteList = z.infer<typeof NoteListSchema>;
