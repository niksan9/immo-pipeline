/**
 * Environment configuration. Loaded from process.env (populated via
 * `node --env-file` in scripts, or the shell/CI). Fails fast on missing keys.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export interface Env {
  databaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  port: number;
  /** Local Expo dev origins allowed to talk to the API. */
  trustedOrigins: string[];
}

/** In tests we point at a separate database; everything else can share defaults. */
export function loadEnv(): Env {
  const isTest = process.env.NODE_ENV === "test";
  const databaseUrl = isTest
    ? required("TEST_DATABASE_URL")
    : required("DATABASE_URL");

  return {
    databaseUrl,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    port: Number(process.env.PORT ?? 3000),
    trustedOrigins: [
      "http://localhost:8081",
      "http://localhost:3000",
      // Expo dev client / Expo Go deep-link origin.
      "exp://",
      // Standalone app scheme (app.json `scheme: "dealpilot"`). The Expo
      // client sends this as its `expo-origin`; the expo() server plugin
      // copies it onto `origin` so the origin check accepts the native app.
      "dealpilot://",
    ],
  };
}

export const env = loadEnv();
