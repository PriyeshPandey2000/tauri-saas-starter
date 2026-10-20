import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "./schema";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../drizzle/", import.meta.url),
);

const TABLES = [
  "notes",
  "session",
  "account",
  "verification",
  "jwks",
  "user",
] as const;

/** In-memory Postgres (PGlite) with the committed migrations applied. */
export async function createTestDb() {
  const client = new PGlite();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(`${MIGRATIONS_DIR}${file}`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) {
        await client.exec(statement);
      }
    }
  }

  const db = drizzle(client, { schema });
  return { client, db };
}

/** Remove every row so one PGlite instance can serve the whole file. */
export async function resetTestDb(client: PGlite): Promise<void> {
  await client.exec(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} CASCADE;`,
  );
}
