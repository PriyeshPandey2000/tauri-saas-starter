import { drizzle } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { ApiEnv } from "../env";
import * as schema from "./schema";

/**
 * The only place that builds a Postgres client for the running API.
 * `DATABASE_URL` is the pooled runtime URL; migrations use
 * `DATABASE_URL_DIRECT` through `drizzle.config.ts`.
 */
export function createDb(
  env: Pick<ApiEnv, "DATABASE_URL" | "DATABASE_POOL_MAX">,
) {
  const client = postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 20,
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database =
  PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;
