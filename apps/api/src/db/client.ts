/**
 * Drizzle client backed by postgres.js.
 *
 * `createDb` builds an isolated client for a given connection string (used by
 * the test suite to target dealpilot_test); `db` is the default app singleton.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDb>["db"];

export function createDb(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

const singleton = createDb(env.databaseUrl);

export const sql = singleton.sql;
export const db = singleton.db;
