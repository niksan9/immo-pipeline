/**
 * better-auth configuration: email + password, Drizzle adapter (Postgres).
 *
 * `createAuth` lets the test suite bind auth to a specific db/baseURL; `auth`
 * is the default app instance and is also what the better-auth CLI reads to
 * generate the schema (`pnpm auth:generate`).
 */
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
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
    user: {
      // Onboarding captures the user's name split into two fields. Declaring
      // them as additionalFields makes better-auth (a) accept them in the
      // sign-up/email body and (b) return them on `getSession().user`. They are
      // optional (required: false) so existing sign-up flows that omit them
      // still succeed. The matching nullable columns live on the `user` table
      // (src/db/auth-schema.ts) — additionalFields do NOT create columns; the
      // drizzle schema + migration must provide them.
      additionalFields: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
      },
    },
    trustedOrigins: options?.trustedOrigins ?? env.trustedOrigins,
    // The Expo server plugin lets the mobile app authenticate: it copies the
    // client's `expo-origin` header onto `origin` so better-auth's origin check
    // passes against a trusted app scheme, and it powers the deep-link OAuth
    // proxy (unused here — we only do email+password). See env.trustedOrigins
    // for the accepted schemes (`dealpilot://`, `exp://`).
    //
    // Cast to the generic plugin type: the plugin's concrete `endpoints` shape
    // pulls zod's deeply-nested (`zod/v4/core`) types into the inferred `Auth`
    // type, which pnpm's realpath layout makes non-portable (TS2742). We never
    // call the plugin's own endpoints (they power OAuth deep-links, unused with
    // email+password), so erasing their types here is safe and keeps `Auth`
    // nameable without a hoisted zod.
    plugins: [expo() as BetterAuthPlugin],
  });
}

export const auth = createAuth();

export type Auth = ReturnType<typeof createAuth>;
