import { describe, expect, it } from "vitest";

import { createSqliteDatabase } from "../sqlite-database";
import { createMemorySqliteClient } from "@/shared/testing/sqlite-test-client";
import {
  MigrationError,
  loadMigrations,
  runMigrations,
  splitStatements,
  type Migration,
} from "../migrations";

function db() {
  return createSqliteDatabase(createMemorySqliteClient());
}

describe("splitStatements", () => {
  it("splits on semicolons and drops comment-only chunks", () => {
    const sql =
      "-- comment\nCREATE TABLE a (id TEXT);\n\nINSERT INTO a VALUES ('x');";
    expect(splitStatements(sql)).toEqual([
      "CREATE TABLE a (id TEXT)",
      "INSERT INTO a VALUES ('x')",
    ]);
  });
});

describe("loadMigrations", () => {
  it("sorts the bundled migrations by file name", () => {
    const names = loadMigrations().map((migration) => migration.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names).toContain("0001_init.sql");
  });
});

describe("runMigrations", () => {
  const migrations: Migration[] = [
    { name: "0001_a.sql", sql: "CREATE TABLE t (id TEXT PRIMARY KEY)" },
    { name: "0002_b.sql", sql: "ALTER TABLE t ADD COLUMN name TEXT" },
  ];

  it("applies pending migrations once and records them", async () => {
    const database = db();
    const first = await runMigrations(database, migrations);
    expect(first).toEqual(["0001_a.sql", "0002_b.sql"]);

    const second = await runMigrations(database, migrations);
    expect(second).toEqual([]);

    const rows = await database.query<{ name: string }>(
      "SELECT name FROM _migrations ORDER BY name",
    );
    expect(rows.map((row) => row.name)).toEqual(["0001_a.sql", "0002_b.sql"]);
  });

  it("rolls back a failing migration and keeps earlier data", async () => {
    const database = db();
    const first = migrations[0];
    if (!first) {
      throw new Error("expected a first migration");
    }
    await runMigrations(database, [first]);
    await database.execute("INSERT INTO t (id) VALUES ($1)", ["row-1"]);

    const failing: Migration[] = [
      { name: "0002_bad.sql", sql: "ALTER TABLE missing ADD COLUMN x TEXT" },
    ];
    await expect(runMigrations(database, failing)).rejects.toBeInstanceOf(
      MigrationError,
    );

    const rows = await database.query<{ id: string }>("SELECT id FROM t");
    expect(rows.map((row) => row.id)).toEqual(["row-1"]);
    const applied = await database.query<{ name: string }>(
      "SELECT name FROM _migrations",
    );
    expect(applied.map((row) => row.name)).toEqual(["0001_a.sql"]);
  });
});

describe("createSqliteDatabase transactions", () => {
  it("commits on success and rolls back on failure", async () => {
    const database = db();
    await database.execute("CREATE TABLE t (id TEXT PRIMARY KEY)");

    await database.transaction(async (tx) => {
      await tx.execute("INSERT INTO t (id) VALUES ($1)", ["committed"]);
    });

    await expect(
      database.transaction(async (tx) => {
        await tx.execute("INSERT INTO t (id) VALUES ($1)", ["rolled-back"]);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const rows = await database.query<{ id: string }>("SELECT id FROM t");
    expect(rows.map((row) => row.id)).toEqual(["committed"]);
  });
});
