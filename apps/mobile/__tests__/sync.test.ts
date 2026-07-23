/**
 * Sync engine unit tests — pure reconciliation + the SyncController driven with
 * a mocked `fetch` and an in-memory store adapter (no React, no backend).
 *
 * Reconcile is skew-free: server-side change = `listing.updatedAt` differs from
 * the per-deal `baseUpdatedAt` baseline (server-vs-server), local change = the
 * `dirty` flag. Device and server clocks are never compared.
 */
import {
  planPush,
  reconcile,
  SyncController,
  type CollabOp,
  type LocalDeal,
  type ServerSummary,
  type SyncStore,
  type Tombstone,
} from '../src/lib/sync';
import type { DealState } from '@dealpilot/core';

/** ISO string for a given epoch-ms (server-clock timestamps are ISO strings). */
const iso = (ms: number): string => new Date(ms).toISOString();

// A minimal but valid-enough DealState (only fields the engine forwards matter).
function state(ort = 'Leipzig'): DealState {
  return {
    deal: {
      objektart: 'ETW',
      ort,
      qm: 70,
      baujahr: 1998,
      kaufpreis: 200000,
      rent: 1000,
      vermietet: 'vermietet',
      dealStatus: 'pruefung',
    },
    priceByCase: { base: 200000, bull: 200000, bear: 200000 },
    scenario: 'base',
    financing: { zins: 4, tilg: 2, ek: 50000, maklerPct: 0.0357 },
    costs: { hausgeld: 100, ruecklage: 50, verwaltung: 30 },
    costGrowth: 2,
    wertZuwachs: 2,
    steig: 2,
    gebaeudewert: 150000,
    afaSatz: 2,
    steuersatz: 42,
    measures: [],
    risks: [],
    collaborators: [],
    contact: { name: 'X', role: 'Y' },
  };
}

function local(partial: Partial<LocalDeal> & { localId: string }): LocalDeal {
  return {
    serverId: null,
    state: state(),
    updatedAt: 0,
    dirty: false,
    baseUpdatedAt: null,
    ...partial,
  };
}

/** An in-memory {@link SyncStore} that records what the engine wrote. */
class FakeStore implements SyncStore {
  deals: LocalDeal[];
  tombstones: Tombstone[];
  collabOps: CollabOp[];
  applied: { serverId: string; updatedAt: number }[] = [];
  pushed: {
    localId: string;
    serverId: string;
    serverUpdatedAt: string;
    expectedUpdatedAt: number;
  }[] = [];
  removedTombstones: string[] = [];
  removedCollabOps: string[] = [];
  dropped: string[] = [];

  constructor(opts: {
    deals?: LocalDeal[];
    tombstones?: Tombstone[];
    collabOps?: CollabOp[];
  } = {}) {
    this.deals = opts.deals ?? [];
    this.tombstones = opts.tombstones ?? [];
    this.collabOps = opts.collabOps ?? [];
  }

  getLocalDeals() {
    return this.deals;
  }
  getTombstones() {
    return this.tombstones;
  }
  getCollabOps() {
    return this.collabOps;
  }
  applyServerDeal(serverId: string, s: DealState, serverUpdatedAt: string) {
    const updatedAt = new Date(serverUpdatedAt).getTime();
    this.applied.push({ serverId, updatedAt });
    const existing = this.deals.find((d) => d.serverId === serverId);
    if (existing) {
      existing.state = s;
      existing.updatedAt = updatedAt;
      existing.dirty = false;
      existing.baseUpdatedAt = serverUpdatedAt;
    } else {
      this.deals.push({
        localId: serverId,
        serverId,
        state: s,
        updatedAt,
        dirty: false,
        baseUpdatedAt: serverUpdatedAt,
      });
    }
  }
  markPushed(
    localId: string,
    serverId: string,
    serverUpdatedAt: string,
    expectedUpdatedAt: number,
  ) {
    this.pushed.push({ localId, serverId, serverUpdatedAt, expectedUpdatedAt });
    const d = this.deals.find((x) => x.localId === localId);
    if (d) {
      d.serverId = serverId;
      d.baseUpdatedAt = serverUpdatedAt;
      // Generation guard, mirrored from the real store: only clear dirty if no
      // local edit landed since the push plan captured this revision.
      d.dirty = d.updatedAt === expectedUpdatedAt ? false : true;
    }
  }
  removeTombstone(localId: string) {
    this.removedTombstones.push(localId);
    this.tombstones = this.tombstones.filter((t) => t.localId !== localId);
  }
  removeCollabOp(id: string) {
    this.removedCollabOps.push(id);
    this.collabOps = this.collabOps.filter((o) => o.id !== id);
  }
  dropLocalDeal(localId: string) {
    this.dropped.push(localId);
    this.deals = this.deals.filter((d) => d.localId !== localId);
  }
}

/** JSON Response helper. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Build a fetch mock from a per-request handler. */
type Handler = (method: string, path: string, body: unknown) => Response;
function mockFetch(handler: Handler): jest.Mock {
  return jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    return handler(method, path, body);
  });
}

function makeController(store: SyncStore, fetchImpl: jest.Mock) {
  return new SyncController({
    baseURL: 'http://localhost:3000',
    store,
    getCookie: () => 'dealpilot.session_token=abc',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    debounceMs: 50,
    intervalMs: 0, // no background timer in tests
  });
}

describe('reconcile (pure, skew-free)', () => {
  it('pulls when the server changed and local is clean (server wins)', () => {
    const locals = [
      local({ localId: 'a', serverId: 's1', baseUpdatedAt: iso(100) }),
    ];
    const summaries: ServerSummary[] = [{ id: 's1', updatedAt: iso(200) }];
    const plan = reconcile(locals, summaries, []);
    expect(plan.pull).toEqual(['s1']);
    expect(plan.put).toHaveLength(0);
  });

  it('PUTs when local is dirty and the server is unchanged (local wins)', () => {
    const locals = [
      local({
        localId: 'a',
        serverId: 's1',
        baseUpdatedAt: iso(200),
        dirty: true,
      }),
    ];
    const summaries: ServerSummary[] = [{ id: 's1', updatedAt: iso(200) }];
    const plan = reconcile(locals, summaries, []);
    expect(plan.pull).toHaveLength(0);
    expect(plan.put.map((d) => d.localId)).toEqual(['a']);
  });

  it('keeps local (PUT) when BOTH changed — conflict, dirty wins', () => {
    const locals = [
      local({
        localId: 'a',
        serverId: 's1',
        baseUpdatedAt: iso(100),
        dirty: true,
      }),
    ];
    const summaries: ServerSummary[] = [{ id: 's1', updatedAt: iso(500) }];
    const plan = reconcile(locals, summaries, []);
    expect(plan.pull).toHaveLength(0);
    expect(plan.put.map((d) => d.localId)).toEqual(['a']);
  });

  it('is skew-safe: a dirty local with a device clock BEHIND the server still PUTs', () => {
    // Local device rev is a tiny ms value (clock behind); server baseline is a
    // large ms value. Old LWW would have pulled (server "newer"); skew-free PUTs.
    const locals = [
      local({
        localId: 'a',
        serverId: 's1',
        updatedAt: 1,
        baseUpdatedAt: iso(1_000_000),
        dirty: true,
      }),
    ];
    const summaries: ServerSummary[] = [{ id: 's1', updatedAt: iso(1_000_000) }];
    const plan = reconcile(locals, summaries, []);
    expect(plan.pull).toHaveLength(0);
    expect(plan.put.map((d) => d.localId)).toEqual(['a']);
  });

  it('POSTs a genuine new local deal (serverId null + dirty)', () => {
    const locals = [local({ localId: 'new', serverId: null, dirty: true })];
    const plan = reconcile(locals, [], []);
    expect(plan.post.map((d) => d.localId)).toEqual(['new']);
  });

  it('does NOT POST an untouched seed (serverId null + dirty:false)', () => {
    const locals = [local({ localId: 'seed', serverId: null, dirty: false })];
    const plan = reconcile(locals, [], []);
    expect(plan.post).toHaveLength(0);
  });

  it('drops a local deal whose serverId vanished from the listing (revoked/deleted), never re-POSTs', () => {
    const locals = [
      local({
        localId: 'a',
        serverId: 's1',
        baseUpdatedAt: iso(100),
        dirty: true, // even with local edits: server-authoritative delete wins
      }),
    ];
    const plan = reconcile(locals, [], []);
    expect(plan.dropLocal).toEqual(['a']);
    expect(plan.post).toHaveLength(0);
    expect(plan.put).toHaveLength(0);
  });

  it('DELETEs a tombstone still present on the server, does not resurrect it', () => {
    const summaries: ServerSummary[] = [{ id: 's1', updatedAt: iso(500) }];
    const tombstones: Tombstone[] = [{ localId: 'a', serverId: 's1' }];
    const plan = reconcile([], summaries, tombstones);
    expect(plan.del.map((t) => t.serverId)).toEqual(['s1']);
    expect(plan.pull).toHaveLength(0);
  });

  it('drops a tombstone the server already lacks (no request needed)', () => {
    const tombstones: Tombstone[] = [{ localId: 'a', serverId: 's-gone' }];
    const plan = reconcile([], [], tombstones);
    expect(plan.del).toHaveLength(0);
    expect(plan.dropTombstones.map((t) => t.localId)).toEqual(['a']);
  });

  it('pulls a server deal unknown locally', () => {
    const summaries: ServerSummary[] = [{ id: 's9', updatedAt: iso(1) }];
    const plan = reconcile([], summaries, []);
    expect(plan.pull).toEqual(['s9']);
  });
});

describe('planPush (pure)', () => {
  it('splits into post / put / del and skips tombstoned locals', () => {
    const locals = [
      local({ localId: 'new', serverId: null, dirty: true }),
      local({ localId: 'dirty', serverId: 's2', updatedAt: 9, dirty: true }),
      local({ localId: 'clean', serverId: 's3', dirty: false }),
      local({ localId: 'gone', serverId: 's4', dirty: true }),
    ];
    const tombstones: Tombstone[] = [{ localId: 'gone', serverId: 's4' }];
    const plan = planPush(locals, tombstones);
    expect(plan.post.map((d) => d.localId)).toEqual(['new']);
    expect(plan.put.map((d) => d.localId)).toEqual(['dirty']);
    expect(plan.del.map((t) => t.serverId)).toEqual(['s4']);
  });

  it('never POSTs an untouched seed (serverId null + dirty:false)', () => {
    const locals = [
      local({ localId: 'seed', serverId: null, dirty: false }),
      local({ localId: 'real', serverId: null, dirty: true }),
    ];
    const plan = planPush(locals, []);
    expect(plan.post.map((d) => d.localId)).toEqual(['real']);
  });
});

describe('SyncController.fullSync', () => {
  it('pulls server-changed deals and POSTs local-new deals', async () => {
    const store = new FakeStore({
      deals: [
        local({ localId: 'a', serverId: 's1', baseUpdatedAt: iso(100) }), // server changed → pull
        local({ localId: 'b', serverId: null, dirty: true }), // new → POST
      ],
    });
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: iso(400) }] });
      }
      if (method === 'GET' && path === '/api/deals/s1') {
        return json({ deal: { id: 's1', state: state('Halle'), updatedAt: iso(400) } });
      }
      if (method === 'POST' && path === '/api/deals') {
        return json({ deal: { id: 'srv-b', state: state(), updatedAt: iso(500) } }, 201);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    expect(store.applied).toEqual([{ serverId: 's1', updatedAt: 400 }]);
    expect(store.pushed).toContainEqual({
      localId: 'b',
      serverId: 'srv-b',
      serverUpdatedAt: iso(500),
      expectedUpdatedAt: 0,
    });
    const b = store.deals.find((d) => d.localId === 'b')!;
    expect(b.serverId).toBe('srv-b');
    expect(b.dirty).toBe(false);
  });

  it('PUTs when local is dirty and the server is unchanged (local wins)', async () => {
    const store = new FakeStore({
      deals: [
        local({ localId: 'a', serverId: 's1', baseUpdatedAt: iso(100), dirty: true }),
      ],
    });
    const puts: string[] = [];
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: iso(100) }] });
      }
      if (method === 'PUT' && path === '/api/deals/s1') {
        puts.push(path);
        return json({ deal: { id: 's1', state: state(), updatedAt: iso(1000) } });
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    expect(puts).toEqual(['/api/deals/s1']);
    const a = store.deals.find((d) => d.localId === 'a')!;
    expect(a.dirty).toBe(false);
    expect(a.baseUpdatedAt).toBe(iso(1000));
  });

  it('drops a deal the server no longer lists instead of re-POSTing it', async () => {
    const store = new FakeStore({
      deals: [
        local({ localId: 'a', serverId: 's1', baseUpdatedAt: iso(100), dirty: true }),
      ],
    });
    const posts: string[] = [];
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') return json({ deals: [] });
      if (method === 'POST') posts.push(path);
      return json({});
    });

    await makeController(store, fetchImpl).fullSync();

    expect(store.dropped).toEqual(['a']);
    expect(posts).toHaveLength(0);
    expect(store.deals.find((d) => d.localId === 'a')).toBeUndefined();
  });

  it('sends X-Idempotency-Key = localId on POST', async () => {
    const store = new FakeStore({
      deals: [local({ localId: 'new-1', serverId: null, dirty: true })],
    });
    let postHeaders: Record<string, string> | undefined;
    const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      const method = init?.method ?? 'GET';
      if (method === 'GET' && path === '/api/deals') return json({ deals: [] });
      if (method === 'POST' && path === '/api/deals') {
        postHeaders = init?.headers as Record<string, string>;
        return json({ deal: { id: 'srv', state: state(), updatedAt: iso(1) } }, 201);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl as unknown as jest.Mock).fullSync();

    expect(postHeaders?.['x-idempotency-key']).toBe('new-1');
  });

  it('keeps a deal dirty when a local edit lands mid-push (lost-update guard)', async () => {
    const store = new FakeStore({
      deals: [local({ localId: 'b', serverId: null, updatedAt: 0, dirty: true })],
    });
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') return json({ deals: [] });
      if (method === 'POST' && path === '/api/deals') {
        // Simulate a local edit arriving WHILE the POST is in flight.
        store.deals[0]!.updatedAt = 42;
        return json({ deal: { id: 'srv-b', state: state(), updatedAt: iso(700) } }, 201);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    const b = store.deals.find((d) => d.localId === 'b')!;
    expect(b.serverId).toBe('srv-b'); // serverId still bound
    expect(b.baseUpdatedAt).toBe(iso(700)); // baseline advanced
    expect(b.dirty).toBe(true); // but NOT marked clean → the newer edit re-syncs
  });

  it('DELETEs a tombstone on the server and clears it locally', async () => {
    const store = new FakeStore({ tombstones: [{ localId: 'a', serverId: 's1' }] });
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: iso(100) }] });
      }
      if (method === 'DELETE' && path === '/api/deals/s1') return json({ ok: true });
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    expect(store.removedTombstones).toEqual(['a']);
  });

  it('goes offline (nothing pushed) when fetch throws, then retries and pushes', async () => {
    const store = new FakeStore({
      deals: [local({ localId: 'b', serverId: null, dirty: true })],
    });
    let online = false;
    const fetchImpl = mockFetch((method, path) => {
      if (!online) throw new TypeError('Network request failed');
      if (method === 'GET' && path === '/api/deals') return json({ deals: [] });
      if (method === 'POST' && path === '/api/deals') {
        return json({ deal: { id: 'srv-b', state: state(), updatedAt: iso(700) } }, 201);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    const controller = makeController(store, fetchImpl);

    await controller.fullSync();
    expect(controller.getStatus().phase).toBe('offline');
    expect(store.pushed).toHaveLength(0); // still queued

    online = true;
    await controller.fullSync();
    const b = store.deals.find((d) => d.localId === 'b')!;
    expect(b.serverId).toBe('srv-b');
    expect(controller.getStatus().phase).toBe('idle');
  });

  it('flushes a queued collaborator add once the deal has a server id', async () => {
    const store = new FakeStore({
      deals: [local({ localId: 'a', serverId: 's1', baseUpdatedAt: iso(100) })],
      collabOps: [
        { id: 'co-1', localId: 'a', op: 'add', email: 'x@y.de', role: 'editor' },
      ],
    });
    const posts: unknown[] = [];
    const fetchImpl = mockFetch((method, path, body) => {
      // List keeps s1 (unchanged) so the deal is not dropped as revoked.
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: iso(100) }] });
      }
      if (method === 'POST' && path === '/api/deals/s1/collaborators') {
        posts.push(body);
        return json({ collaborator: {} }, 201);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    expect(posts).toEqual([{ email: 'x@y.de', role: 'editor' }]);
    expect(store.removedCollabOps).toEqual(['co-1']);
  });
});

describe('SyncController — 401 / expired session', () => {
  it('stops the interval and triggers re-auth on a 401 from the list (no retry loop)', async () => {
    jest.useFakeTimers();
    try {
      const store = new FakeStore({
        deals: [local({ localId: 'b', serverId: null, dirty: true })],
      });
      let calls = 0;
      const onUnauthorized = jest.fn();
      const fetchImpl = mockFetch((method, path) => {
        calls += 1;
        if (method === 'GET' && path === '/api/deals') return json({ message: 'nope' }, 401);
        throw new Error(`unexpected ${method} ${path}`);
      });
      const controller = new SyncController({
        baseURL: 'http://localhost:3000',
        store,
        getCookie: () => 'c',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        intervalMs: 1000,
        onUnauthorized,
      });
      controller.start();

      await controller.fullSync();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(controller.getStatus().phase).toBe('unauthorized');

      const callsAfterFirst = calls;
      // The interval must be stopped: advancing time fires no further syncs.
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(calls).toBe(callsAfterFirst);

      // An explicit further sync short-circuits (latched), no new request.
      await controller.fullSync();
      expect(calls).toBe(callsAfterFirst);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('short-circuits a per-item 401 instead of continue-looping', async () => {
    const store = new FakeStore({
      deals: [
        local({ localId: 'a', serverId: 's1', baseUpdatedAt: iso(100) }),
        local({ localId: 'c', serverId: 's2', baseUpdatedAt: iso(100) }),
      ],
    });
    const onUnauthorized = jest.fn();
    const itemGets: string[] = [];
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({
          deals: [
            { id: 's1', updatedAt: iso(999) }, // both server-changed → both pull
            { id: 's2', updatedAt: iso(999) },
          ],
        });
      }
      if (method === 'GET' && path.startsWith('/api/deals/')) {
        itemGets.push(path);
        return json({ message: 'nope' }, 401);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    const controller = new SyncController({
      baseURL: 'http://localhost:3000',
      store,
      getCookie: () => 'c',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      intervalMs: 0,
      onUnauthorized,
    });

    await controller.fullSync();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(controller.getStatus().phase).toBe('unauthorized');
    // Broke out on the FIRST item's 401 — did not loop to the second.
    expect(itemGets).toHaveLength(1);
  });
});

describe('SyncController.notifyLocalChange (debounced push)', () => {
  it('coalesces rapid mutations into a single delayed push', async () => {
    jest.useFakeTimers();
    try {
      const store = new FakeStore({
        deals: [local({ localId: 'b', serverId: null, dirty: true })],
      });
      const fetchImpl = mockFetch((method, path) => {
        if (method === 'POST' && path === '/api/deals') {
          return json({ deal: { id: 'srv-b', state: state(), updatedAt: iso(1) } }, 201);
        }
        throw new Error(`unexpected ${method} ${path}`);
      });
      const controller = makeController(store, fetchImpl);

      controller.notifyLocalChange();
      controller.notifyLocalChange();
      controller.notifyLocalChange();
      expect(fetchImpl).not.toHaveBeenCalled();

      jest.advanceTimersByTime(60);
      await Promise.resolve();
      await Promise.resolve();

      const posts = fetchImpl.mock.calls.filter(
        (c) => (c[1]?.method ?? 'GET') === 'POST',
      );
      expect(posts).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
