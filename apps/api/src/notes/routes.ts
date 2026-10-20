import type { Hono } from "hono";
import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import {
  NOTE_PAGE_DEFAULT,
  NOTE_PAGE_MAX,
  NoteInputSchema,
  NoteUpdateSchema,
} from "@app/shared";

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
  /** The verified JWT subject, or `null` when the claim is missing. */
  const ownerId = (c: {
    get: (key: "claims") => { sub?: unknown };
  }): string | null => {
    const sub = c.get("claims").sub;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  };

  const unauthorized = (c: {
    json: (body: unknown, status: 401) => Response;
  }) => c.json({ error: "unauthorized" }, 401);

  /** `(updated_at, id)` cursor: newer pages first, ids break ties. */
  const encodeCursor = (row: NoteRow): string =>
    `${encodeURIComponent(row.updatedAt.toISOString())}|${row.id}`;

  const decodeCursor = (
    raw: string | undefined,
  ): { at: Date; id: string } | "invalid" | null => {
    if (!raw) {
      return null;
    }
    const separator = raw.lastIndexOf("|");
    if (separator <= 0) {
      return "invalid";
    }
    const at = new Date(decodeURIComponent(raw.slice(0, separator)));
    const id = raw.slice(separator + 1);
    if (Number.isNaN(at.getTime()) || !id) {
      return "invalid";
    }
    return { at, id };
  };

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
    const userId = ownerId(c);
    if (!userId) {
      return unauthorized(c);
    }
    const requested = Number(c.req.query("limit") ?? NOTE_PAGE_DEFAULT);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), NOTE_PAGE_MAX)
      : NOTE_PAGE_DEFAULT;
    const cursor = decodeCursor(c.req.query("before"));
    if (cursor === "invalid") {
      return c.json({ error: "invalid_cursor" }, 400);
    }
    const conditions: SQL[] = [
      eq(notes.userId, userId),
      isNull(notes.deletedAt),
    ];
    if (cursor) {
      const older = or(
        lt(notes.updatedAt, cursor.at),
        and(eq(notes.updatedAt, cursor.at), lt(notes.id, cursor.id)),
      );
      if (older) {
        conditions.push(older);
      }
    }
    const rows = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.updatedAt), desc(notes.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor = rows.length > limit && last ? encodeCursor(last) : null;
    return c.json({ notes: page.map(toJson), nextCursor });
  });

  app.post("/notes", async (c) => {
    const parsed = NoteInputSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ error: "invalid_note" }, 400);
    }
    const userId = ownerId(c);
    if (!userId) {
      return unauthorized(c);
    }
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
    const userId = ownerId(c);
    if (!userId) {
      return unauthorized(c);
    }
    const row = await findOwned(userId, c.req.param("id"));
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
    if (!userId) {
      return unauthorized(c);
    }
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
    if (!userId) {
      return unauthorized(c);
    }
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
    if (!userId) {
      return unauthorized(c);
    }
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
