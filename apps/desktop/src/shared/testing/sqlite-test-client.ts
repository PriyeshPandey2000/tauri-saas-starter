import { DatabaseSync } from "node:sqlite";

/**
 * In-memory SQLite client for tests. It mirrors the `select`/`execute`/`close`
 * shape of `@tauri-apps/plugin-sql`'s `Database` with no vendor import, so
 * adapters and features can both drive the real `DatabasePort` in tests.
 * `$1, $2, ...` placeholders become positional `?` for `node:sqlite`.
 */
export interface TestSqliteClient {
  raw: DatabaseSync;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(
    query: string,
    bindValues?: unknown[],
  ): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  close(): Promise<boolean>;
}

export function createMemorySqliteClient(): TestSqliteClient {
  const db = new DatabaseSync(":memory:");
  return {
    raw: db,
    async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
      const statement = db.prepare(toPositional(query));
      return statement.all(...toBind(bindValues)) as T;
    },
    async execute(query, bindValues = []) {
      const statement = db.prepare(toPositional(query));
      const result = statement.run(...toBind(bindValues));
      return {
        rowsAffected: Number(result.changes),
        lastInsertId: Number(result.lastInsertRowid),
      };
    },
    async close() {
      db.close();
      return true;
    },
  };
}

function toPositional(query: string): string {
  return query.replace(/\$\d+/g, "?");
}

function toBind(values: unknown[]): (string | number | null | Uint8Array)[] {
  return values.map((value) =>
    value === undefined ? null : (value as string | number | null | Uint8Array),
  );
}
