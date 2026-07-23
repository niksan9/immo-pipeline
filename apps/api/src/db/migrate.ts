/**
 * Applies pending Drizzle migrations from ./drizzle against DATABASE_URL.
 * Run via `pnpm db:migrate`. Also reused by the test harness to migrate the
 * throwaway test database.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "drizzle",
);

export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });
  try {
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder });
  } finally {
    await sql.end();
  }
}

// When executed directly (not imported), migrate the primary database.
const isDirect = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirect) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run migrations");
  runMigrations(url)
    .then(() => {
      console.log("Migrations applied.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
