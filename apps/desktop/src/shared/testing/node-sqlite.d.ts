// The desktop app targets the browser and does not include Node types.
// Declare just the `node:sqlite` surface the test helpers use.
declare module "node:sqlite" {
  export interface StatementSync {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
  }
  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}
