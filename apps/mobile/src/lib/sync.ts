/**
 * Offline-first sync engine.
 *
 * The device store is the source of truth; the server is a replica we push to
 * and pull from in the background. Everything keeps working offline — mutations
 * queue locally (dirty flags + tombstones) and flush when connectivity returns.
 *
 * Reconciliation is last-write-wins by `updatedAt`:
 *   - server newer than local  → pull (server wins, local dirty flag cleared),
 *   - local same-or-newer + dirty → push (PUT),
 *   - local with no serverId    → push (POST),
 *   - local delete (tombstone)  → DELETE on server, never resurrected on pull.
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
  /** Local last-modified time (ms). Bumped on every local mutation. */
  updatedAt: number;
  /** True when the deal has local changes not yet pushed to the server. */
  dirty: boolean;
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
  updatedAt: number;
  dirty: boolean;
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
  /** Upsert a deal pulled from the server (server state wins). */
  applyServerDeal(serverId: string, state: DealState, updatedAt: number): void;
  /** Record a successful push: bind serverId, clear dirty, set updatedAt. */
  markPushed(localId: string, serverId: string, updatedAt: number): void;
  /** Drop a tombstone once its server DELETE has completed (or is moot). */
  removeTombstone(localId: string): void;
  /** Drop a collaborator op once it has been applied server-side. */
  removeCollabOp(id: string): void;
}

// ---------------------------------------------------------------------------
// Pure reconciliation
// ---------------------------------------------------------------------------

/** The work a full sync needs to do, computed purely from local + server state. */
export interface SyncPlan {
  /** Server ids to fetch + apply locally (server newer, or unknown locally). */
  pull: string[];
  /** Local deals to create on the server (no serverId yet). */
  post: LocalDeal[];
  /** Local deals to update on the server (dirty, already have a serverId). */
  put: LocalDeal[];
  /** Tombstones to DELETE on the server (have a serverId). */
  del: Tombstone[];
  /** Tombstones already gone server-side — safe to drop with no request. */
  dropTombstones: Tombstone[];
}

const ms = (iso: string): number => new Date(iso).getTime();

/**
 * Reconcile local deals against the server listing. Pure — no I/O.
 *
 * `pull` returns server ids whose full state should be fetched and applied.
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
  };

  // Deletes: DELETE tombstones still present on the server; drop the rest.
  for (const t of tombstones) {
    if (t.serverId && serverIds.has(t.serverId)) plan.del.push(t);
    else plan.dropTombstones.push(t);
  }

  const localByServerId = new Map<string, LocalDeal>();
  for (const l of locals) {
    if (l.serverId) localByServerId.set(l.serverId, l);
  }

  // Server → local direction.
  for (const s of serverSummaries) {
    if (tombServerIds.has(s.id)) continue; // locally deleted; don't resurrect
    const local = localByServerId.get(s.id);
    if (!local) {
      plan.pull.push(s.id); // unknown locally → pull
      continue;
    }
    if (ms(s.updatedAt) > local.updatedAt) {
      plan.pull.push(s.id); // server newer → server wins
    } else if (local.dirty) {
      plan.put.push(local); // local same-or-newer with changes → push
    }
  }

  // Local → server direction: brand-new local deals (never pushed).
  const tombLocalIds = new Set(tombstones.map((t) => t.localId));
  for (const l of locals) {
    if (tombLocalIds.has(l.localId)) continue;
    if (l.serverId == null) {
      plan.post.push(l);
    } else if (l.dirty && !byServerId.has(l.serverId)) {
      // Dirty locally but the server no longer lists it (e.g. removed server
      // side). Pragmatic LWW: re-create it so local changes aren't lost.
      plan.post.push(l);
    }
  }

  return plan;
}

/**
 * The push-only plan (no server listing available): POST new, PUT dirty, DELETE
 * tombstoned. Used by the debounced, mutation-driven push where we optimistically
 * flush local changes without a full reconcile.
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
    if (l.serverId == null) post.push(l);
    else if (l.dirty) put.push(l);
  }
  const del = tombstones.filter((t) => t.serverId != null);
  return { post, put, del };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export type SyncPhase = "idle" | "syncing" | "offline" | "error";

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
}

/** Thrown internally to signal "network unreachable" (fetch rejected). */
class OfflineError extends Error {}

export class SyncController {
  private readonly baseURL: string;
  private readonly store: SyncStore;
  private readonly getCookie: () => string;
  private readonly fetchImpl: typeof fetch;
  private readonly debounceMs: number;
  private readonly intervalMs: number;
  private readonly onStatus?: (status: SyncStatus) => void;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private status: SyncStatus = { phase: "idle", lastSyncAt: null, pending: 0 };

  constructor(opts: SyncControllerOptions) {
    this.baseURL = opts.baseURL.replace(/\/$/, "");
    this.store = opts.store;
    this.getCookie = opts.getCookie;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.debounceMs = opts.debounceMs ?? 800;
    this.intervalMs = opts.intervalMs ?? 30_000;
    this.onStatus = opts.onStatus;
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
  ): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseURL}${path}`, {
        method,
        headers: this.headers(body !== undefined),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      // A thrown fetch means the network/API is unreachable → we are offline.
      throw new OfflineError();
    }
    return res;
  }

  /**
   * Full bidirectional sync: pull the server listing, reconcile, apply pulls,
   * flush pushes/deletes and the collaborator queue. Safe to call repeatedly;
   * concurrent calls are coalesced.
   */
  async fullSync(): Promise<void> {
    if (this.running) return;
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

      // Pull server-authoritative deals.
      for (const serverId of plan.pull) {
        const res = await this.request("GET", `/api/deals/${serverId}`);
        if (!res.ok) continue;
        const { deal } = (await res.json()) as { deal: ServerDeal };
        this.store.applyServerDeal(deal.id, deal.state, ms(deal.updatedAt));
      }

      await this.flushPushes(plan.post, plan.put, plan.del);
      await this.flushCollabOps();

      this.setStatus({ phase: "idle", lastSyncAt: Date.now() });
    } catch (err) {
      this.setStatus({ phase: err instanceof OfflineError ? "offline" : "error" });
    } finally {
      this.running = false;
    }
  }

  /** Push-only pass (mutation-driven, no server listing fetched). */
  async pushOnly(): Promise<void> {
    if (this.running) return;
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
      this.setStatus({ phase: err instanceof OfflineError ? "offline" : "error" });
    } finally {
      this.running = false;
    }
  }

  private async flushPushes(
    post: LocalDeal[],
    put: LocalDeal[],
    del: Tombstone[],
  ): Promise<void> {
    for (const d of post) {
      const res = await this.request("POST", "/api/deals", d.state);
      if (!res.ok) continue;
      const { deal } = (await res.json()) as { deal: ServerDeal };
      this.store.markPushed(d.localId, deal.id, ms(deal.updatedAt));
    }
    for (const d of put) {
      if (!d.serverId) continue;
      const res = await this.request("PUT", `/api/deals/${d.serverId}`, d.state);
      if (res.ok) {
        const { deal } = (await res.json()) as { deal: ServerDeal };
        this.store.markPushed(d.localId, deal.id, ms(deal.updatedAt));
      }
      // A 404 means the deal is gone server-side; leave it for the next
      // fullSync to reconcile (it may re-POST). 403/other: keep dirty.
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
