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

  const isProduction = process.env.NODE_ENV === "production";

  return {
    databaseUrl,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    port: Number(process.env.PORT ?? 3000),
    // Native deep-link schemes are a bare `scheme://` — unlike an https origin
    // there is no host/port to pin, so trusting the scheme trusts *every* deep
    // link on it. We accept that tradeoff only for schemes we control:
    //   - `dealpilot://` is the app's own scheme identity (app.json
    //     `scheme: "dealpilot"`). The Expo client sends it as its `expo-origin`;
    //     the expo() server plugin copies it onto `origin` so the origin check
    //     accepts the native app. Kept in every environment.
    //   - `exp://` is the Expo Go / dev-client origin — not app-specific, so
    //     trusting it in production would widen the origin check to any
    //     Expo-hosted deep link. Included ONLY when NODE_ENV !== "production".
    trustedOrigins: [
      "http://localhost:8081",
      "http://localhost:3000",
      "dealpilot://",
      ...(isProduction ? [] : ["exp://"]),
    ],
  };
}

export const env = loadEnv();
