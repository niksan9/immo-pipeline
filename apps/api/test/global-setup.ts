/**
 * Runs once before the whole vitest suite: migrates the real test database
 * (dealpilot_test) to the latest Drizzle schema.
 */
import { runMigrations } from "../src/db/migrate.js";

export default async function setup() {
  process.loadEnvFile(new URL("../.env", import.meta.url).pathname);
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required for tests");
  if (!/_test(\?|$)/.test(url)) {
    throw new Error(
      `Refusing to run tests against a non-_test database: ${url}`,
    );
  }
  await runMigrations(url);
}
