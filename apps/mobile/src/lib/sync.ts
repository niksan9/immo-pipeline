/**
 * Offline-first sync engine.
 *
 * The device store is the source of truth; the server is a replica we push to
 * and pull from in the background. Everything keeps working offline — mutations
 * queue locally (dirty flags + tombstones) and flush when connectivity returns.
 *
 * Reconciliation is SKEW-FREE (no device-clock vs server-clock comparison). It
 * uses a per-deal server baseline (`baseUpdatedAt` = the server's `updatedAt` at
 * the last successful pull/push) to detect server-side changes server-vs-server,
 * and the local `dirty` flag (NOT timestamps) to detect local changes:
 *
 *   ┌─────────────────┬────────────────┬──────────────────────────────────────┐
 *   │ server changed? │ local dirty?   │ action                               │
 *   │ (listing.upd ≠  │                │                                      │
 *   │  baseUpdatedAt) │                │                                      │
 *   ├─────────────────┼────────────────┼──────────────────────────────────────┤
 *   │ yes             │ no             │ PULL (server wins, dirty stays clear) │
 *   │ no              │ yes            │ PUT  (local wins, normal push)        │
 *   │ yes             │ yes            │ CONFLICT → PUT (dirty wins, keep local│
 *   │                 │                │   so offline edits aren't discarded)  │
 *   │ no              │ no             │ nothing                              │
 *   └─────────────────┴────────────────┴──────────────────────────────────────┘
 *
 * Other directions:
 *   - local with no serverId + dirty → POST (a genuine user-owned new deal).
 *     Seeded demo deals stay `dirty:false` and are NEVER pushed (see store).
 *   - local WITH a serverId absent from the listing → the server deleted it or
 *     revoked access → DROP it locally (server-authoritative delete wins); it is
 *     NOT re-POSTed. (Tradeoff: offline edits to a concurrently-deleted deal are
 *     lost — acceptable under server-wins-on-delete.)
 *   - local delete (tombstone) → DELETE on server, never resurrected on pull.
 *
 * CONFLICT tradeoff: when both sides changed we keep the local edit (dirty wins)
 * rather than the server's, so a user's offline work is never silently thrown
 * away; the losing server revision is overwritten by the next PUT.
 *
 * Docs/chats slices are intentionally NOT synced — the API has no endpoints for
 * them yet, so they stay device-local (see store.tsx / documents.ts / chats.ts).
 *
 * Network reachability is inferred from `fetch` failures (a thrown fetch = we
 * are offline / the API is unreachable); no NetInfo dependency is used. Failed
 * work stays queued and is retried on the next foreground / interval tick.
 *
 * The engine talks to the store through the injected {@link SyncStore} adapter
 * and to the network through an injected `fetch` + `getCookie`, so all of its
 * logic is unit-testable without React or a real backend.
 */

import type { DealState } from "@dealpilot/core";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/** Per-deal sync bookkeeping, persisted alongside the deal. */
export interface DealSyncMeta {
  /** Server UUID once the deal has been POSTed (null until then). */
  serverId: string | null;
  /**
   * Local revision marker (device Date.now(), ms). Bumped on every local
   * mutation. INTERNAL ONLY — used as a dirtiness/generation marker (see the
   * markPushed generation check), never compared against server timestamps.
   */
  updatedAt: number;
  /** True when the deal has local changes not yet pushed to the server. */
  dirty: boolean;
  /**
   * The server's `updatedAt` (ISO string) at the last successful pull/push —
   * the skew-free baseline reconcile compares the listing against to detect a
   * server-side change (server-vs-server). `null` until the deal is first
   * synced (a brand-new local deal that has never been pushed).
   */
  baseUpdatedAt: string | null;
}

/** A locally-deleted deal, kept so a pull can't resurrect it. */
export interface Tombstone {
  localId: string;
  /** Server UUID to DELETE, or null if the deal was never pushed. */
  serverId: string | null;
}

/** A queued collaborator mutation (inherently server-side). */
export interface CollabOp {
  id: string;
  localId: string;
  op: "add" | "remove";
  email: string;
  /** Server role for adds ("editor" | "viewer"). */
  role?: "editor" | "viewer";
}

/** A local deal as the engine sees it (deal state + sync meta). */
export interface LocalDeal {
  localId: string;
  serverId: string | null;
  state: DealState;
  /** Internal local revision marker (see {@link DealSyncMeta.updatedAt}). */
  updatedAt: number;
  dirty: boolean;
  /** Skew-free server baseline (see {@link DealSyncMeta.baseUpdatedAt}). */
  baseUpdatedAt: string | null;
}

/** GET /api/deals row (denormalized listing columns + timestamps). */
export interface ServerSummary {
  id: string;
  updatedAt: string;
}

/** GET /api/deals/:id payload we care about. */
export interface ServerDeal {
  id: string;
  state: DealState;
  updatedAt: string;
}

/** The adapter the engine uses to read/write the local store. */
export interface SyncStore {
  getLocalDeals(): LocalDeal[];
  getTombstones(): Tombstone[];
  getCollabOps(): CollabOp[];
  /**
   * Upsert a deal pulled from the server (server state wins). `serverUpdatedAt`
   * is the server's ISO `updatedAt`, saved as the new skew-free baseline.
   */
  applyServerDeal(
    serverId: string,
    state: DealState,
    serverUpdatedAt: string,
  ): void;
  /**
   * Record a successful push: bind `serverId` and advance the server baseline
   * to `serverUpdatedAt`. Clear `dirty` ONLY if the deal's current local
   * revision still equals `expectedUpdatedAt` (the value captured before the
   * request) — i.e. no local edit landed mid-flight. If an edit did land, keep
   * `dirty:true` so the newer edit re-syncs (lost-update guard).
   */
  markPushed(
    localId: string,
    serverId: string,
    serverUpdatedAt: string,
    expectedUpdatedAt: number,
  ): void;
  /** Drop a tombstone once its server DELETE has completed (or is moot). */
  removeTombstone(localId: string): void;
  /** Drop a collaborator op once it has been applied server-side. */
  removeCollabOp(id: string): void;
  /**
   * Remove a local deal the server no longer lists (deleted elsewhere or access
   * revoked). Server-authoritative deletion wins: the deal is dropped locally
   * with NO tombstone and NO re-POST.
   */
  dropLocalDeal(localId: string): void;
}

// ---------------------------------------------------------------------------
// Pure reconciliation
// ---------------------------------------------------------------------------

/** The work a full sync needs to do, computed purely from local + server state. */
export interface SyncPlan {
  /** Server ids to fetch + apply locally (server changed, or unknown locally). */
  pull: string[];
  /** Local deals to create on the server (no serverId yet, user-owned-new). */
  post: LocalDeal[];
  /** Local deals to update on the server (dirty, already have a serverId). */
  put: LocalDeal[];
  /** Tombstones to DELETE on the server (have a serverId). */
  del: Tombstone[];
  /** Tombstones already gone server-side — safe to drop with no request. */
  dropTombstones: Tombstone[];
  /**
   * localIds of deals that HAVE a serverId but are absent from the server
   * listing (deleted elsewhere / access revoked) → drop locally, do NOT re-POST.
   */
  dropLocal: string[];
}

const ms = (iso: string): number => new Date(iso).getTime();

/**
 * Reconcile local deals against the server listing. Pure — no I/O. Skew-free:
 * server-side change is `listing.updatedAt !== baseUpdatedAt` (server-vs-server)
 * and local change is the `dirty` flag; device/server clocks are never compared.
 * See the decision table in the module header.
 */
export function reconcile(
  locals: LocalDeal[],
  serverSummaries: ServerSummary[],
  tombstones: Tombstone[],
): SyncPlan {
  const byServerId = new Map<string, ServerSummary>();
  for (const s of serverSummaries) byServerId.set(s.id, s);

  const tombServerIds = new Set(
    tombstones.map((t) => t.serverId).filter((x): x is string => x != null),
  );
  const serverIds = new Set(serverSummaries.map((s) => s.id));

  const plan: SyncPlan = {
    pull: [],
    post: [],
    put: [],
    del: [],
    dropTombstones: [],
    dropLocal: [],
  };

  // Deletes: DELETE tombstones still present on the server; drop the rest.
  for (const t of tombstones) {
    if (t.serverId && serverIds.has(t.serverId)) plan.del.push(t);
    else plan.dropTombstones.push(t);
  }

  const tombLocalIds = new Set(tombstones.map((t) => t.localId));

  // Local → server direction (and change detection for known deals).
  for (const l of locals) {
    if (tombLocalIds.has(l.localId)) continue;

    if (l.serverId == null) {
      // A brand-new local deal. POST only when genuinely user-owned-new
      // (dirty). Untouched seeded demo deals are `dirty:false` and stay
      // device-local — they are NEVER pushed to the user's real account.
      if (l.dirty) plan.post.push(l);
      continue;
    }

    // Locally deleted too (its serverId is tombstoned): the tombstone/DELETE
    // path owns it — skip here so we neither pull nor drop it.
    if (tombServerIds.has(l.serverId)) continue;

    const summary = byServerId.get(l.serverId);
    if (!summary) {
      // Has a serverId but the server no longer lists it → deleted elsewhere or
      // access revoked → server-authoritative delete wins. Drop it locally; do
      // NOT re-POST (which would resurrect it as a fresh owned deal).
      plan.dropLocal.push(l.localId);
      continue;
    }

    // Skew-free change detection.
    const serverChanged =
      l.baseUpdatedAt == null || ms(summary.updatedAt) !== ms(l.baseUpdatedAt);
    if (serverChanged && !l.dirty) {
      plan.pull.push(l.serverId); // server changed, local clean → server wins
    } else if (l.dirty) {
      // local dirty → PUT. Covers both "server unchanged" (normal push) and
      // "both changed" (CONFLICT: dirty wins, keep the user's local edits).
      plan.put.push(l);
    }
    // neither changed → nothing.
  }

  // Server → local direction: server deals unknown locally → pull (unless we
  // deleted them locally, in which case the tombstone must not be resurrected).
  const knownServerIds = new Set(
    locals.map((l) => l.serverId).filter((x): x is string => x != null),
  );
  for (const s of serverSummaries) {
    if (tombServerIds.has(s.id)) continue; // locally deleted; don't resurrect
    if (!knownServerIds.has(s.id)) plan.pull.push(s.id);
  }

  return plan;
}

/**
 * The push-only plan (no server listing available): POST new, PUT dirty, DELETE
 * tombstoned. Used by the debounced, mutation-driven push where we optimistically
 * flush local changes without a full reconcile.
 *
 * A local deal is POSTed only when it is user-owned-new (`serverId == null &&
 * dirty`), so untouched seeded demo deals (`dirty:false`) are never uploaded.
 */
export function planPush(
  locals: LocalDeal[],
  tombstones: Tombstone[],
): Pick<SyncPlan, "post" | "put" | "del"> {
  const tombLocalIds = new Set(tombstones.map((t) => t.localId));
  const post: LocalDeal[] = [];
  const put: LocalDeal[] = [];
  for (const l of locals) {
    if (tombLocalIds.has(l.localId)) continue;
    if (l.serverId == null) {
      if (l.dirty) post.push(l); // user-owned-new only; seeds stay local
    } else if (l.dirty) {
      put.push(l);
    }
  }
  const del = tombstones.filter((t) => t.serverId != null);
  return { post, put, del };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export type SyncPhase =
  | "idle"
  | "syncing"
  | "offline"
  | "error"
  /** The API rejected our session (HTTP 401): sync is halted pending re-auth. */
  | "unauthorized";

export interface SyncStatus {
  phase: SyncPhase;
  /** Epoch ms of the last fully-successful sync, or null. */
  lastSyncAt: number | null;
  /** Count of local items still awaiting push (dirty + tombstones + collab ops). */
  pending: number;
}

export interface SyncControllerOptions {
  baseURL: string;
  store: SyncStore;
  /** Cookie header for authed requests. */
  getCookie: () => string;
  /** Injectable fetch (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Debounce for the mutation-driven push (ms). */
  debounceMs?: number;
  /** Background retry interval while items are pending (ms). 0 disables. */
  intervalMs?: number;
  /** Notified whenever status changes (for the UI indicator). */
  onStatus?: (status: SyncStatus) => void;
  /**
   * Called once when the API rejects our session (HTTP 401). The engine has
   * already stopped its timers and set phase 'unauthorized'; the app should
   * sign the user out (→ AuthGate returns to the sign-in screen). Never called
   * more than once per controller.
   */
  onUnauthorized?: () => void;
}

/** Thrown internally to signal "network unreachable" (fetch rejected). */
class OfflineError extends Error {}

/** Thrown internally on an HTTP 401 to short-circuit the whole sync pass. */
class UnauthorizedError extends Error {}

export class SyncController {
  private readonly baseURL: string;
  private readonly store: SyncStore;
  private readonly getCookie: () => string;
  private readonly fetchImpl: typeof fetch;
  private readonly debounceMs: number;
  private readonly intervalMs: number;
  private readonly onStatus?: (status: SyncStatus) => void;
  private readonly onUnauthorized?: () => void;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  /** Latched once a 401 is seen: all further syncs short-circuit until re-auth. */
  private unauthorized = false;
  private status: SyncStatus = { phase: "idle", lastSyncAt: null, pending: 0 };

  constructor(opts: SyncControllerOptions) {
    this.baseURL = opts.baseURL.replace(/\/$/, "");
    this.store = opts.store;
    this.getCookie = opts.getCookie;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.debounceMs = opts.debounceMs ?? 800;
    this.intervalMs = opts.intervalMs ?? 30_000;
    this.onStatus = opts.onStatus;
    this.onUnauthorized = opts.onUnauthorized;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  /** Start the background retry interval. */
  start(): void {
    if (this.intervalMs > 0 && this.intervalTimer == null) {
      this.intervalTimer = setInterval(() => {
        if (this.pendingCount() > 0) void this.fullSync();
      }, this.intervalMs);
    }
  }

  /** Stop timers (e.g. on sign-out / unmount). */
  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.debounceTimer = null;
    this.intervalTimer = null;
  }

  /** Call after a local mutation: debounce a push. */
  notifyLocalChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.pushOnly();
    }, this.debounceMs);
  }

  private pendingCount(): number {
    const dirty = this.store
      .getLocalDeals()
      .filter((d) => d.dirty || d.serverId == null).length;
    return (
      dirty +
      this.store.getTombstones().length +
      this.store.getCollabOps().length
    );
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch, pending: this.pendingCount() };
    this.onStatus?.(this.status);
  }

  private headers(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    const cookie = this.getCookie();
    if (cookie) h["cookie"] = cookie;
    if (json) h["content-type"] = "application/json";
    return h;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseURL}${path}`, {
        method,
        headers: { ...this.headers(body !== undefined), ...extraHeaders },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      // A thrown fetch means the network/API is unreachable → we are offline.
      throw new OfflineError();
    }
    // An expired/invalid session (401) must stop the loop, not be retried per
    // item. Throw so the whole pass short-circuits and re-auth is triggered.
    if (res.status === 401) throw new UnauthorizedError();
    return res;
  }

  /**
   * Full bidirectional sync: pull the server listing, reconcile, apply pulls,
   * flush pushes/deletes and the collaborator queue. Safe to call repeatedly;
   * concurrent calls are coalesced.
   */
  async fullSync(): Promise<void> {
    if (this.running || this.unauthorized) return;
    this.running = true;
    this.setStatus({ phase: "syncing" });
    try {
      const listRes = await this.request("GET", "/api/deals");
      if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
      const { deals: summaries } = (await listRes.json()) as {
        deals: ServerSummary[];
      };

      const plan = reconcile(
        this.store.getLocalDeals(),
        summaries,
        this.store.getTombstones(),
      );

      // Tombstones the server already dropped: clear with no request.
      for (const t of plan.dropTombstones) this.store.removeTombstone(t.localId);

      // Deals the server no longer lists (deleted / access revoked elsewhere):
      // drop locally, server-authoritative delete wins (never re-POSTed).
      for (const localId of plan.dropLocal) this.store.dropLocalDeal(localId);

      // Pull server-authoritative deals.
      for (const serverId of plan.pull) {
        const res = await this.request("GET", `/api/deals/${serverId}`);
        if (!res.ok) continue;
        const { deal } = (await res.json()) as { deal: ServerDeal };
        this.store.applyServerDeal(deal.id, deal.state, deal.updatedAt);
      }

      await this.flushPushes(plan.post, plan.put, plan.del);
      await this.flushCollabOps();

      this.setStatus({ phase: "idle", lastSyncAt: Date.now() });
    } catch (err) {
      this.handleError(err);
    } finally {
      this.running = false;
    }
  }

  /** Push-only pass (mutation-driven, no server listing fetched). */
  async pushOnly(): Promise<void> {
    if (this.running || this.unauthorized) return;
    this.running = true;
    this.setStatus({ phase: "syncing" });
    try {
      const { post, put, del } = planPush(
        this.store.getLocalDeals(),
        this.store.getTombstones(),
      );
      await this.flushPushes(post, put, del);
      await this.flushCollabOps();
      this.setStatus({ phase: "idle", lastSyncAt: Date.now() });
    } catch (err) {
      this.handleError(err);
    } finally {
      this.running = false;
    }
  }

  /** Map a thrown sync error to a status; a 401 halts the loop and re-auths. */
  private handleError(err: unknown): void {
    if (err instanceof UnauthorizedError) {
      // Stop hammering the server: halt timers, latch, and trigger re-auth.
      this.unauthorized = true;
      this.stop();
      this.setStatus({ phase: "unauthorized" });
      this.onUnauthorized?.();
      return;
    }
    this.setStatus({ phase: err instanceof OfflineError ? "offline" : "error" });
  }

  private async flushPushes(
    post: LocalDeal[],
    put: LocalDeal[],
    del: Tombstone[],
  ): Promise<void> {
    for (const d of post) {
      // Capture the local revision BEFORE the request so markPushed can detect
      // an edit that lands mid-flight (lost-update guard).
      const captured = d.updatedAt;
      // Idempotency: on a retried POST after a dropped response, the server
      // (keyed on X-Idempotency-Key = localId) returns the same deal instead of
      // creating a duplicate. See the POST /api/deals contract.
      const res = await this.request("POST", "/api/deals", d.state, {
        "x-idempotency-key": d.localId,
      });
      if (!res.ok) continue;
      const { deal } = (await res.json()) as { deal: ServerDeal };
      this.store.markPushed(d.localId, deal.id, deal.updatedAt, captured);
    }
    for (const d of put) {
      if (!d.serverId) continue;
      const captured = d.updatedAt;
      const res = await this.request("PUT", `/api/deals/${d.serverId}`, d.state);
      if (res.ok) {
        const { deal } = (await res.json()) as { deal: ServerDeal };
        this.store.markPushed(d.localId, deal.id, deal.updatedAt, captured);
      }
      // A 404 means the deal is gone server-side; leave it for the next
      // fullSync to reconcile (it will dropLocal). 403/other: keep dirty.
    }
    for (const t of del) {
      if (!t.serverId) {
        this.store.removeTombstone(t.localId);
        continue;
      }
      const res = await this.request("DELETE", `/api/deals/${t.serverId}`);
      // 200 (deleted) or 404 (already gone) both mean the tombstone is done.
      if (res.ok || res.status === 404) this.store.removeTombstone(t.localId);
    }
  }

  private async flushCollabOps(): Promise<void> {
    const localById = new Map(
      this.store.getLocalDeals().map((d) => [d.localId, d]),
    );
    for (const op of this.store.getCollabOps()) {
      const deal = localById.get(op.localId);
      // Collaborators are server-side; skip until the deal has a serverId.
      if (!deal?.serverId) continue;
      const path = `/api/deals/${deal.serverId}/collaborators`;
      const res =
        op.op === "add"
          ? await this.request("POST", path, {
              email: op.email,
              role: op.role ?? "editor",
            })
          : await this.request("DELETE", path, { email: op.email });
      if (res.ok || res.status === 404) this.store.removeCollabOp(op.id);
    }
  }
}
