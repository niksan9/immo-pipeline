import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  "postgres://dealpilot:dealpilot_dev_pw@localhost:5434/dealpilot";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
});
