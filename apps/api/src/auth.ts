/**
 * better-auth configuration: email + password, Drizzle adapter (Postgres).
 *
 * `createAuth` lets the test suite bind auth to a specific db/baseURL; `auth`
 * is the default app instance and is also what the better-auth CLI reads to
 * generate the schema (`pnpm auth:generate`).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db as defaultDb, type Database } from "./db/client.js";
import { env } from "./env.js";

export function createAuth(options?: {
  db?: Database;
  baseURL?: string;
  secret?: string;
  trustedOrigins?: string[];
}) {
  const database = options?.db ?? defaultDb;
  return betterAuth({
    baseURL: options?.baseURL ?? env.betterAuthUrl,
    secret: options?.secret ?? env.betterAuthSecret,
    database: drizzleAdapter(database, { provider: "pg" }),
    emailAndPassword: {
      enabled: true,
      // Dev convenience: no email round-trip required to sign in.
      requireEmailVerification: false,
    },
    trustedOrigins: options?.trustedOrigins ?? env.trustedOrigins,
  });
}

export const auth = createAuth();

export type Auth = ReturnType<typeof createAuth>;
