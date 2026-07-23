/**
 * Hono application factory.
 *
 * `createApp({ auth, db })` wires better-auth (mounted at /api/auth/*) and the
 * deal routes (under /api, session-protected) against injected dependencies so
 * the integration tests can bind them to the throwaway test database.
 */
import type { DealState } from "@dealpilot/core";
import { and, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import type { Auth } from "./auth.js";
import type { Database } from "./db/client.js";
import {
  dealCollaborators,
  deals,
  user as userTable,
  type CollaboratorRole,
} from "./db/schema.js";
import { denormalize, isDealStateLike } from "./denormalize.js";

export interface AuthedUser {
  id: string;
  email: string;
}

export type Variables = {
  user: AuthedUser;
};

export interface AppDeps {
  auth: Auth;
  db: Database;
}

/** Effective role a user has on a deal, or null when they have no access. */
type Access = { role: "owner" | CollaboratorRole } | null;

export function createApp({ auth, db }: AppDeps) {
  const app = new Hono<{ Variables: Variables }>();

  // ---- better-auth: handles signup/signin/signout/session etc. ----
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  // ---- Session middleware for everything else under /api ----
  const api = new Hono<{ Variables: Variables }>();

  api.use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", { id: session.user.id, email: session.user.email });
    await next();
  });

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function getAccess(dealId: string, userId: string): Promise<Access> {
    // A malformed id can never match a row — treat as not found (avoids a
    // Postgres cast error surfacing as a 500).
    if (!UUID_RE.test(dealId)) return null;
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      columns: { ownerId: true },
    });
    if (!deal) return null;
    if (deal.ownerId === userId) return { role: "owner" };
    const collab = await db.query.dealCollaborators.findFirst({
      where: and(
        eq(dealCollaborators.dealId, dealId),
        eq(dealCollaborators.userId, userId),
      ),
      columns: { role: true },
    });
    return collab ? { role: collab.role } : null;
  }

  // ---- GET /api/deals — deals the user owns or collaborates on ----
  api.get("/deals", async (c) => {
    const uid = c.get("user").id;
    const collabRows = await db.query.dealCollaborators.findMany({
      where: eq(dealCollaborators.userId, uid),
      columns: { dealId: true },
    });
    const collabIds = collabRows.map((r) => r.dealId);

    const where =
      collabIds.length > 0
        ? or(eq(deals.ownerId, uid), inArray(deals.id, collabIds))
        : eq(deals.ownerId, uid);

    const rows = await db
      .select({
        id: deals.id,
        ownerId: deals.ownerId,
        dealStatus: deals.dealStatus,
        title: deals.title,
        ort: deals.ort,
        kaufpreis: deals.kaufpreis,
        score: deals.score,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(where);

    return c.json({ deals: rows });
  });

  // ---- POST /api/deals — create (optionally idempotent) ----
  api.post("/deals", async (c) => {
    const uid = c.get("user").id;
    const body = await c.req.json().catch(() => null);
    if (!isDealStateLike(body)) {
      return c.json({ error: "Invalid deal state" }, 400);
    }
    const state = body as DealState;
    const d = denormalize(state);

    // Optional idempotency: the client sends its local deal id as an opaque
    // key. A replay of the same (owner, key) returns the already-created deal
    // (200) instead of inserting a duplicate. Absent header → plain create.
    const idempotencyKey = c.req.header("X-Idempotency-Key");
    if (idempotencyKey) {
      const existing = await db.query.deals.findFirst({
        where: and(
          eq(deals.ownerId, uid),
          eq(deals.clientId, idempotencyKey),
        ),
      });
      if (existing) return c.json({ deal: existing }, 200);
    }

    const [row] = await db
      .insert(deals)
      .values({
        ownerId: uid,
        clientId: idempotencyKey ?? null,
        dealStatus: d.dealStatus,
        state,
        title: d.title,
        ort: d.ort,
        kaufpreis: d.kaufpreis,
        score: d.score,
      })
      .returning();
    return c.json({ deal: row }, 201);
  });

  // ---- GET /api/deals/:id — full state (owner or collaborator) ----
  api.get("/deals/:id", async (c) => {
    const uid = c.get("user").id;
    const id = c.req.param("id");
    const access = await getAccess(id, uid);
    if (!access) return c.json({ error: "Not found" }, 404);
    const row = await db.query.deals.findFirst({ where: eq(deals.id, id) });
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ deal: row, role: access.role });
  });

  // ---- PUT /api/deals/:id — replace state (owner or editor) ----
  api.put("/deals/:id", async (c) => {
    const uid = c.get("user").id;
    const id = c.req.param("id");
    const access = await getAccess(id, uid);
    if (!access) return c.json({ error: "Not found" }, 404);
    if (access.role === "viewer") {
      return c.json({ error: "Forbidden" }, 403);
    }
    const body = await c.req.json().catch(() => null);
    if (!isDealStateLike(body)) {
      return c.json({ error: "Invalid deal state" }, 400);
    }
    const state = body as DealState;
    const d = denormalize(state);
    const [row] = await db
      .update(deals)
      .set({
        state,
        dealStatus: d.dealStatus,
        title: d.title,
        ort: d.ort,
        kaufpreis: d.kaufpreis,
        score: d.score,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id))
      .returning();
    return c.json({ deal: row });
  });

  // ---- DELETE /api/deals/:id — owner only ----
  api.delete("/deals/:id", async (c) => {
    const uid = c.get("user").id;
    const id = c.req.param("id");
    const access = await getAccess(id, uid);
    if (!access) return c.json({ error: "Not found" }, 404);
    if (access.role !== "owner") {
      return c.json({ error: "Forbidden" }, 403);
    }
    await db.delete(deals).where(eq(deals.id, id));
    return c.json({ ok: true });
  });

  // ---- POST /api/deals/:id/collaborators — invite by email (owner only) ----
  api.post("/deals/:id/collaborators", async (c) => {
    const uid = c.get("user").id;
    const id = c.req.param("id");
    const access = await getAccess(id, uid);
    if (!access) return c.json({ error: "Not found" }, 404);
    if (access.role !== "owner") {
      return c.json({ error: "Forbidden" }, 403);
    }
    const body = (await c.req.json().catch(() => null)) as {
      email?: unknown;
      role?: unknown;
    } | null;
    const email = typeof body?.email === "string" ? body.email : null;
    const role = body?.role;
    if (!email || (role !== "editor" && role !== "viewer")) {
      return c.json({ error: "email and role (editor|viewer) required" }, 400);
    }
    const invitee = await db.query.user.findFirst({
      where: eq(userTable.email, email),
      columns: { id: true },
    });
    if (!invitee) {
      return c.json({ error: "No user with that email" }, 404);
    }
    if (invitee.id === uid) {
      return c.json({ error: "Owner cannot be a collaborator" }, 400);
    }
    // Atomic upsert: a single INSERT ... ON CONFLICT keyed on the
    // (deal_id, user_id) primary key. Re-inviting the same user updates their
    // role (and re-stamps invitedAt) in one statement — no DELETE-then-INSERT
    // window in which a concurrent request could double-insert or lose a row.
    const [row] = await db
      .insert(dealCollaborators)
      .values({ dealId: id, userId: invitee.id, role })
      .onConflictDoUpdate({
        target: [dealCollaborators.dealId, dealCollaborators.userId],
        set: { role, invitedAt: new Date() },
      })
      .returning();
    return c.json({ collaborator: row }, 201);
  });

  // ---- DELETE /api/deals/:id/collaborators — remove by email (owner only) ----
  api.delete("/deals/:id/collaborators", async (c) => {
    const uid = c.get("user").id;
    const id = c.req.param("id");
    const access = await getAccess(id, uid);
    if (!access) return c.json({ error: "Not found" }, 404);
    if (access.role !== "owner") {
      return c.json({ error: "Forbidden" }, 403);
    }
    const body = (await c.req.json().catch(() => null)) as {
      email?: unknown;
    } | null;
    const email = typeof body?.email === "string" ? body.email : null;
    if (!email) return c.json({ error: "email required" }, 400);
    const target = await db.query.user.findFirst({
      where: eq(userTable.email, email),
      columns: { id: true },
    });
    if (!target) return c.json({ error: "No user with that email" }, 404);
    await db
      .delete(dealCollaborators)
      .where(
        and(
          eq(dealCollaborators.dealId, id),
          eq(dealCollaborators.userId, target.id),
        ),
      );
    return c.json({ ok: true });
  });

  app.route("/api", api);

  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}

export type App = ReturnType<typeof createApp>;
