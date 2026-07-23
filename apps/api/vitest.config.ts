import { defineConfig } from "vitest/config";

// Load apps/api/.env (TEST_DATABASE_URL etc.) and mark the run as a test run so
// env.ts targets the throwaway test database.
process.loadEnvFile(new URL(".env", import.meta.url).pathname);
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // Integration tests share one Postgres database and truncate between cases,
    // so they must not run in parallel.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
