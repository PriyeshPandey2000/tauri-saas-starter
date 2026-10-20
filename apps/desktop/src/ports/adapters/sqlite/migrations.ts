import type { DatabasePort } from "../../DatabasePort";

/**
 * Numbered migration files, bundled at build time from
 * `src-tauri/migrations/`. Keys are full paths; the file name is the tag.
 */
const MIGRATION_FILES = import.meta.glob(
  "../../../../src-tauri/migrations/*.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

export interface Migration {
  name: string;
  sql: string;
}

/** Parse a migration file into statements (concatenation-safe: no values). */
export function loadMigrations(
  files: Record<string, string> = MIGRATION_FILES,
): Migration[] {
  return Object.entries(files)
    .map(([path, sql]) => ({
      name: path.split("/").pop() ?? path,
      sql,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export class MigrationError extends Error {
  readonly migration: string;

  constructor(migration: string, cause: unknown) {
    super(
      `Migration ${migration} failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause },
    );
    this.name = "MigrationError";
    this.migration = migration;
  }
}

/** Split a migration file into single statements (the drivers run one at a time). */
export function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .map((line) => (line.trimStart().startsWith("--") ? "" : line))
    .join("\n");
  return withoutComments
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/**
 * Apply every migration newer than the highest recorded one, in order, each
 * inside its own transaction. A failure rolls that migration back and throws,
 * so the database keeps its previous schema and data.
 */
export async function runMigrations(
  db: DatabasePort,
  migrations: Migration[] = loadMigrations(),
): Promise<string[]> {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const rows = await db.query<{ name: string }>(
    "SELECT name FROM _migrations ORDER BY name",
  );
  const applied = new Set(rows.map((row) => row.name));
  const ran: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }
    try {
      await db.transaction(async (tx) => {
        for (const statement of splitStatements(migration.sql)) {
          await tx.execute(statement);
        }
        await tx.execute(
          "INSERT INTO _migrations (name, applied_at) VALUES ($1, $2)",
          [migration.name, new Date().toISOString()],
        );
      });
    } catch (error) {
      throw new MigrationError(migration.name, error);
    }
    ran.push(migration.name);
  }

  return ran;
}
