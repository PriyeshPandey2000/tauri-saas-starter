import { beforeEach, describe, expect, it } from "vitest";

import { createSqliteDatabase } from "@/ports/adapters/sqlite/sqlite-database";
import { runMigrations } from "@/ports/adapters/sqlite/migrations";
import { createMemorySqliteClient } from "@/shared/testing/sqlite-test-client";
import type { DatabasePort } from "@/ports";
import { createLocalNotesRepository } from "@/shared/lib/local-notes-repository";
import type { NotesRepository } from "@/shared/lib/repository";

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
    expect(await repository.list()).toHaveLength(2);

    const updated = await repository.update(created.id, { title: "First!" });
    expect(updated.title).toBe("First!");
    expect(updated.body).toBe("hello");

    await repository.remove(second.id);
    const remaining = await repository.list();
    expect(remaining.map((note) => note.id)).toEqual([created.id]);

    const restored = await repository.restore(second.id);
    expect(restored.title).toBe("Second");
    expect(await repository.list()).toHaveLength(2);
  });

  it("returns null for a missing note and throws on update of a missing note", async () => {
    expect(await repository.get("nope")).toBeNull();
    await expect(repository.update("nope", { title: "x" })).rejects.toThrow(
      "not found",
    );
  });

  it("rejects a title that is empty after trimming", async () => {
    await expect(
      repository.create({ title: "   ", body: "" }),
    ).rejects.toThrow();
  });
});
