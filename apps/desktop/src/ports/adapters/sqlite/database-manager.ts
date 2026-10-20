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

/**
 * A signed-in user's database file name. Auth ids are opaque, so hash them:
 * a sanitising scheme would map `a.b` and `a_b` to the same file.
 */
export async function databaseName(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(userId),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `app-${hex}.db`;
}

import type { DatabaseManager } from "../../DatabaseManagerPort";

export interface DatabaseManagerOptions {
  /** Inject a client for tests; production loads `@tauri-apps/plugin-sql`. */
  createClient?: (userId: string) => Promise<SqlClient>;
}

/**
 * Owns the one open SQLite connection. Opens and closes run through a single
 * queue, so a quick `open(a)` then `open(b)` always finishes a's open, closes
 * it, then opens b. Opening runs the local migrations; a failure sets the
 * error state (error screen) and leaves the data untouched.
 * Imported only through `ports/index.ts` (rule 2/15).
 */
export function createDatabaseManager(
  options: DatabaseManagerOptions = {},
): DatabaseManager {
  let openUserId: string | null = null;
  let port: DatabasePort | null = null;
  let client: SqlClient | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const pending = new Map<string, Promise<DatabasePort>>();

  const createClient =
    options.createClient ??
    (async (userId: string) => {
      const db = await Database.load(`sqlite:${await databaseName(userId)}`);
      return db as unknown as SqlClient;
    });

  /** Run `fn` after every previously queued open/close has settled. */
  function serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

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
    open(userId: string) {
      if (openUserId === userId && port) {
        return Promise.resolve(port);
      }
      const existing = pending.get(userId);
      if (existing) {
        return existing;
      }
      const opening = serialize(() => openDatabase(userId)).finally(() => {
        pending.delete(userId);
      });
      pending.set(userId, opening);
      return opening;
    },
    close: () => serialize(closeDatabase),
  };
}
