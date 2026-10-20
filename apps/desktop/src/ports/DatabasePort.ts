/** A value that can be bound to a SQL statement parameter. */
export type SqlParam = string | number | null | Uint8Array;

export interface ExecuteResult {
  rowsAffected: number;
  lastInsertId?: number;
}

/**
 * SQL access to the one database a signed-in user owns. Statements take bound
 * parameters only; callers must never build SQL by concatenating values.
 */
export interface DatabasePort {
  /** Run a SELECT and return the rows typed by the caller-provided schema. */
  query<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  /** Run a statement (INSERT/UPDATE/DELETE/DDL) and report affected rows. */
  execute(sql: string, params?: SqlParam[]): Promise<ExecuteResult>;
  /**
   * Run `fn` inside one transaction on a single connection. `fn` receives a
   * database handle whose `query`/`execute` run on that transaction. The
   * transaction commits when `fn` resolves and rolls back when it throws.
   */
  transaction<T>(fn: (tx: DatabasePort) => Promise<T>): Promise<T>;
}
