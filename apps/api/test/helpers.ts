/**
 * Integration test harness. Binds the real app/auth/db to the throwaway
 * dealpilot_test database and drives it through app.fetch (no network server).
 */
import { createApp } from "../src/app.js";
import { createAuth } from "../src/auth.js";
import { createDb } from "../src/db/client.js";

const TEST_URL = process.env.TEST_DATABASE_URL!;
const BASE_URL = "http://localhost:3000";

const { db, sql } = createDb(TEST_URL);
const auth = createAuth({
  db,
  baseURL: BASE_URL,
  secret: "test-secret-0123456789abcdef",
  trustedOrigins: [BASE_URL, "http://localhost:8081", "exp://", "dealpilot://"],
});
const app = createApp({ auth, db });

export { app, auth, db, sql, BASE_URL };

/** Remove all rows between tests. Order/CASCADE handles FKs. */
export async function truncateAll(): Promise<void> {
  await sql/* sql */ `TRUNCATE TABLE
    deal_collaborators, deals, "session", "account", "verification", "user"
    RESTART IDENTITY CASCADE`;
}

export async function closeDb(): Promise<void> {
  await sql.end();
}

/** A signed-in user: their id, email, and the Cookie header to authenticate. */
export interface TestUser {
  id: string;
  email: string;
  cookie: string;
}

function cookieHeaderFrom(res: Response): string {
  const cookies = res.headers.getSetCookie();
  // Reduce Set-Cookie values to a single `name=value; name=value` Cookie header.
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

/** Sign up a fresh user via better-auth and return their session cookie. */
export async function signup(
  email: string,
  password = "sup3rsecret!",
  name = "Test User",
): Promise<TestUser> {
  const res = await app.fetch(
    new Request(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    }),
  );
  if (res.status !== 200) {
    throw new Error(`signup failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { user: { id: string } };
  return { id: body.user.id, email, cookie: cookieHeaderFrom(res) };
}

/** Sign in an existing user; returns a fresh session cookie. */
export async function signin(
  email: string,
  password = "sup3rsecret!",
): Promise<string> {
  const res = await app.fetch(
    new Request(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  if (res.status !== 200) {
    throw new Error(`signin failed (${res.status}): ${await res.text()}`);
  }
  return cookieHeaderFrom(res);
}

/** Fire an authenticated (or not) JSON request at the app. */
export async function apiRequest(
  method: string,
  path: string,
  opts: {
    cookie?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<Response> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.cookie) headers["cookie"] = opts.cookie;
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  return app.fetch(
    new Request(`${BASE_URL}${path}`, { method, headers, body }),
  );
}
