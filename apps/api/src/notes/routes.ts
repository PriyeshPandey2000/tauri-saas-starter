import type { Hono } from "hono";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NoteInputSchema, NoteUpdateSchema } from "@app/shared";

import type { Database } from "../db/client";
import { notes } from "../db/schema";
import type { AuthVariables } from "../auth/require-auth";

interface NoteRow {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

function toJson(row: NoteRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Register the notes API on `app`. Every query is scoped to the verified JWT
 * subject (`sub`), so a request for another user's note returns 404 — never the
 * row, and never a 403 that would confirm the id exists.
 */
export function registerNotesRoutes(
  app: Hono<{ Variables: AuthVariables }>,
  db: Database,
): void {
  const ownerId = (c: { get: (key: "claims") => { sub?: unknown } }): string =>
    String(c.get("claims").sub ?? "");

  const findOwned = async (
    userId: string,
    id: string,
  ): Promise<NoteRow | null> => {
    const rows = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, id),
          eq(notes.userId, userId),
          isNull(notes.deletedAt),
        ),
      );
    return rows[0] ?? null;
  };

  app.get("/notes", async (c) => {
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, ownerId(c)), isNull(notes.deletedAt)))
      .orderBy(desc(notes.updatedAt));
    return c.json({ notes: rows.map(toJson) });
  });

  app.post("/notes", async (c) => {
    const parsed = NoteInputSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ error: "invalid_note" }, 400);
    }
    const userId = ownerId(c);
    const now = new Date();
    const [row] = await db
      .insert(notes)
      .values({
        id: crypto.randomUUID(),
        userId,
        title: parsed.data.title,
        body: parsed.data.body,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ note: toJson(row) }, 201);
  });

  app.get("/notes/:id", async (c) => {
    const row = await findOwned(ownerId(c), c.req.param("id"));
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ note: toJson(row) });
  });

  app.patch("/notes/:id", async (c) => {
    const parsed = NoteUpdateSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ error: "invalid_note" }, 400);
    }
    const userId = ownerId(c);
    const id = c.req.param("id");
    const existing = await findOwned(userId, id);
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }
    const [row] = await db
      .update(notes)
      .set({
        title: parsed.data.title ?? existing.title,
        body: parsed.data.body ?? existing.body,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ note: toJson(row) });
  });

  app.delete("/notes/:id", async (c) => {
    const userId = ownerId(c);
    const id = c.req.param("id");
    const existing = await findOwned(userId, id);
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }
    await db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return c.json({ ok: true });
  });

  app.post("/notes/:id/restore", async (c) => {
    const userId = ownerId(c);
    const id = c.req.param("id");
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    if (!rows[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    const [row] = await db
      .update(notes)
      .set({ deletedAt: null })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ note: toJson(row) });
  });
}
