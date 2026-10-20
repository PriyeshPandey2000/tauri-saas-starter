import Database from "@tauri-apps/plugin-sql";

import type { DatabasePort } from "../../DatabasePort";
import { runMigrations } from "./migrations";
import { useDatabaseStore } from "../../../shared/lib/db-status";
import { createSqliteDatabase, type SqlClient } from "./sqlite-database";

const PRAGMAS = [
  "PRAGMA journal_mode=WAL",
  "PRAGMA foreign_keys=ON",
  "PRAGMA synchronous=NORMAL",
];

/** A signed-in user's database file name; ids are opaque strings from auth. */
export function databaseName(userId: string): string {
  const safe = userId.replace(/[^A-Za-z0-9_-]/g, "_");
  return `app-${safe}.db`;
}

export interface DatabaseManager {
  /** The open database, or `null` before sign-in / after sign-out. */
  current(): DatabasePort | null;
  /** Open `userId`'s database, apply pragmas and migrations. Idempotent. */
  open(userId: string): Promise<DatabasePort>;
  /** Close the open database, if any. Called from the sign-out registry. */
  close(): Promise<void>;
}

export interface DatabaseManagerOptions {
  /** Inject a client for tests; production loads `@tauri-apps/plugin-sql`. */
  createClient?: (userId: string) => Promise<SqlClient>;
}

/**
 * Owns the one open SQLite connection. Opening runs the local migrations; a
 * failure sets the error state (error screen) and leaves the data untouched.
 * Imported only through `ports/index.ts` (rule 2/15).
 */
export function createDatabaseManager(
  options: DatabaseManagerOptions = {},
): DatabaseManager {
  let openUserId: string | null = null;
  let port: DatabasePort | null = null;
  let client: SqlClient | null = null;
  let pending: Promise<DatabasePort> | null = null;

  const createClient =
    options.createClient ??
    (async (userId: string) => {
      const db = await Database.load(`sqlite:${databaseName(userId)}`);
      return db as unknown as SqlClient;
    });

  async function openDatabase(userId: string): Promise<DatabasePort> {
    if (openUserId === userId && port) {
      return port;
    }
    await closeDatabase();
    useDatabaseStore.getState().setOpening(userId);
    let created: SqlClient | null = null;
    try {
      created = await createClient(userId);
      const database = createSqliteDatabase(created);
      for (const pragma of PRAGMAS) {
        await database.execute(pragma);
      }
      await runMigrations(database);
      client = created;
      port = database;
      openUserId = userId;
      useDatabaseStore.getState().setReady(userId);
      return database;
    } catch (error) {
      await created?.close?.().catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      useDatabaseStore.getState().setError(userId, message);
      throw error;
    }
  }

  async function closeDatabase(): Promise<void> {
    const closing = client;
    client = null;
    port = null;
    openUserId = null;
    if (closing?.close) {
      await closing.close().catch(() => undefined);
    }
  }

  return {
    current: () => port,
    open: (userId: string) => {
      pending ??= openDatabase(userId).finally(() => {
        pending = null;
      });
      return pending;
    },
    close: closeDatabase,
  };
}
