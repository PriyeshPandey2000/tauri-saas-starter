import { beforeEach, describe, expect, it } from "vitest";

import { createSqliteDatabase } from "@/ports/adapters/sqlite/sqlite-database";
import { runMigrations } from "@/ports/adapters/sqlite/migrations";
import { createMemorySqliteClient } from "@/shared/testing/sqlite-test-client";
import type { DatabasePort } from "@/ports";
import { createLocalNotesRepository } from "@/features/notes/local-notes-repository";
import type { NotesRepository } from "@/features/notes/repository-core";

describe("createLocalNotesRepository", () => {
  let db: DatabasePort;
  let repository: NotesRepository;

  beforeEach(async () => {
    db = createSqliteDatabase(createMemorySqliteClient());
    await runMigrations(db);
    repository = createLocalNotesRepository(db);
  });

  it("creates, lists, updates and soft-deletes notes", async () => {
    const created = await repository.create({ title: "First", body: "hello" });
    expect(created.id).toBeTruthy();
    expect(created.title).toBe("First");

    const second = await repository.create({ title: "Second", body: "" });
    expect((await repository.list()).notes).toHaveLength(2);

    const updated = await repository.update(created.id, { title: "First!" });
    expect(updated.title).toBe("First!");
    expect(updated.body).toBe("hello");

    await repository.remove(second.id);
    const remaining = await repository.list();
    expect(remaining.notes.map((note) => note.id)).toEqual([created.id]);

    const restored = await repository.restore(second.id);
    expect(restored.title).toBe("Second");
    expect((await repository.list()).notes).toHaveLength(2);
  });

  it("returns null for a missing note and throws on update of a missing note", async () => {
    expect(await repository.get("nope")).toBeNull();
    await expect(repository.update("nope", { title: "x" })).rejects.toThrow(
      "not found",
    );
  });

  it("skips and logs an invalid row without hiding the valid ones", async () => {
    const good = await repository.create({ title: "Good", body: "ok" });
    await db.execute(
      `INSERT INTO notes (id, title, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      ["broken", "", "bad", "not-a-date", "not-a-date"],
    );

    const { notes } = await repository.list();
    expect(notes.map((note) => note.id)).toEqual([good.id]);
  });

  it("rejects a title that is empty after trimming", async () => {
    await expect(
      repository.create({ title: "   ", body: "" }),
    ).rejects.toThrow();
  });
});
