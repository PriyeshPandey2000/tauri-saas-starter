import type { DatabasePort, ExecuteResult, SqlParam } from "../../DatabasePort";

/**
 * The slice of a SQLite client the adapter needs. Matches both
 * `@tauri-apps/plugin-sql`'s `Database` and the test client so the same adapter
 * runs in the app and in tests.
 */
export interface SqlClient {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(query: string, bindValues?: unknown[]): Promise<ExecuteResult>;
  close?(): Promise<boolean>;
}

/**
 * SQLite-backed `DatabasePort`. `@tauri-apps/plugin-sql` is imported only here
 * (rule 2). Statements use `$1, $2, ...` placeholders with bound parameters.
 */
export function createSqliteDatabase(client: SqlClient): DatabasePort {
  // One in-process mutex per database: SQLite is a single writer, and the
  // plugin's pool does not expose a transaction API, so we serialize the
  // BEGIN/COMMIT window instead of interleaving statements across connections.
  let queue: Promise<unknown> = Promise.resolve();

  const base: DatabasePort = {
    async query<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      const rows = await client.select<T[]>(sql, params);
      return rows;
    },
    async execute(
      sql: string,
      params: SqlParam[] = [],
    ): Promise<ExecuteResult> {
      return client.execute(sql, params);
    },
    async transaction<T>(fn: (tx: DatabasePort) => Promise<T>): Promise<T> {
      const run = async (): Promise<T> => {
        await client.execute("BEGIN IMMEDIATE");
        try {
          const result = await fn(base);
          await client.execute("COMMIT");
          return result;
        } catch (error) {
          await client.execute("ROLLBACK").catch(() => undefined);
          throw error;
        }
      };
      const next = queue.then(run, run);
      queue = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
  };

  return base;
}
