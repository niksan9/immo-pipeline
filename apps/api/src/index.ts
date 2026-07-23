/**
 * Server entrypoint. Boots the Hono app on @hono/node-server.
 * Run with `pnpm dev` (tsx watch) — env is read from process.env; use
 * `node --env-file=.env` or a shell that exports the .env values.
 */
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { auth } from "./auth.js";
import { db } from "./db/client.js";
import { env } from "./env.js";

const app = createApp({ auth, db });

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`DealPilot API listening on http://localhost:${info.port}`);
});
