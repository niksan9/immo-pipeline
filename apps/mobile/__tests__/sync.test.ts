/**
 * Sync engine unit tests — pure reconciliation + the SyncController driven with
 * a mocked `fetch` and an in-memory store adapter (no React, no backend).
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
    ...partial,
  };
}

/** An in-memory {@link SyncStore} that records what the engine wrote. */
class FakeStore implements SyncStore {
  deals: LocalDeal[];
  tombstones: Tombstone[];
  collabOps: CollabOp[];
  applied: { serverId: string; updatedAt: number }[] = [];
  pushed: { localId: string; serverId: string; updatedAt: number }[] = [];
  removedTombstones: string[] = [];
  removedCollabOps: string[] = [];

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
  applyServerDeal(serverId: string, s: DealState, updatedAt: number) {
    this.applied.push({ serverId, updatedAt });
    const existing = this.deals.find((d) => d.serverId === serverId);
    if (existing) {
      existing.state = s;
      existing.updatedAt = updatedAt;
      existing.dirty = false;
    } else {
      this.deals.push({
        localId: serverId,
        serverId,
        state: s,
        updatedAt,
        dirty: false,
      });
    }
  }
  markPushed(localId: string, serverId: string, updatedAt: number) {
    this.pushed.push({ localId, serverId, updatedAt });
    const d = this.deals.find((x) => x.localId === localId);
    if (d) {
      d.serverId = serverId;
      d.updatedAt = updatedAt;
      d.dirty = false;
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

describe('reconcile (pure)', () => {
  it('pulls when the server copy is newer (server wins)', () => {
    const locals = [local({ localId: 'a', serverId: 's1', updatedAt: 100 })];
    const summaries: ServerSummary[] = [
      { id: 's1', updatedAt: new Date(200).toISOString() },
    ];
    const plan = reconcile(locals, summaries, []);
    expect(plan.pull).toEqual(['s1']);
    expect(plan.put).toHaveLength(0);
  });

  it('pushes (PUT) when local is dirty and same-or-newer (local wins)', () => {
    const locals = [
      local({ localId: 'a', serverId: 's1', updatedAt: 300, dirty: true }),
    ];
    const summaries: ServerSummary[] = [
      { id: 's1', updatedAt: new Date(200).toISOString() },
    ];
    const plan = reconcile(locals, summaries, []);
    expect(plan.pull).toHaveLength(0);
    expect(plan.put.map((d) => d.localId)).toEqual(['a']);
  });

  it('POSTs a local-only deal that the server does not know', () => {
    const locals = [local({ localId: 'new', serverId: null, dirty: true })];
    const plan = reconcile(locals, [], []);
    expect(plan.post.map((d) => d.localId)).toEqual(['new']);
  });

  it('DELETEs a tombstone still present on the server, does not resurrect it', () => {
    const summaries: ServerSummary[] = [
      { id: 's1', updatedAt: new Date(500).toISOString() },
    ];
    const tombstones: Tombstone[] = [{ localId: 'a', serverId: 's1' }];
    const plan = reconcile([], summaries, tombstones);
    expect(plan.del.map((t) => t.serverId)).toEqual(['s1']);
    // Must NOT be pulled back in.
    expect(plan.pull).toHaveLength(0);
  });

  it('drops a tombstone the server already lacks (no request needed)', () => {
    const tombstones: Tombstone[] = [{ localId: 'a', serverId: 's-gone' }];
    const plan = reconcile([], [], tombstones);
    expect(plan.del).toHaveLength(0);
    expect(plan.dropTombstones.map((t) => t.localId)).toEqual(['a']);
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
});

describe('SyncController.fullSync', () => {
  it('pulls server-newer deals and POSTs local-new deals', async () => {
    const store = new FakeStore({
      deals: [
        local({ localId: 'a', serverId: 's1', updatedAt: 100 }), // server newer → pull
        local({ localId: 'b', serverId: null, dirty: true }), // new → POST
      ],
    });
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: new Date(400).toISOString() }] });
      }
      if (method === 'GET' && path === '/api/deals/s1') {
        return json({
          deal: { id: 's1', state: state('Halle'), updatedAt: new Date(400).toISOString() },
        });
      }
      if (method === 'POST' && path === '/api/deals') {
        return json(
          { deal: { id: 'srv-b', state: state(), updatedAt: new Date(500).toISOString() } },
          201,
        );
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    expect(store.applied).toEqual([{ serverId: 's1', updatedAt: 400 }]);
    expect(store.pushed).toContainEqual({
      localId: 'b',
      serverId: 'srv-b',
      updatedAt: 500,
    });
  });

  it('PUTs when local is dirty and server is older (local wins)', async () => {
    const store = new FakeStore({
      deals: [local({ localId: 'a', serverId: 's1', updatedAt: 900, dirty: true })],
    });
    const puts: string[] = [];
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: new Date(100).toISOString() }] });
      }
      if (method === 'PUT' && path === '/api/deals/s1') {
        puts.push(path);
        return json({ deal: { id: 's1', state: state(), updatedAt: new Date(1000).toISOString() } });
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await makeController(store, fetchImpl).fullSync();

    expect(puts).toEqual(['/api/deals/s1']);
    expect(store.pushed).toContainEqual({ localId: 'a', serverId: 's1', updatedAt: 1000 });
  });

  it('DELETEs a tombstone on the server and clears it locally', async () => {
    const store = new FakeStore({
      tombstones: [{ localId: 'a', serverId: 's1' }],
    });
    const fetchImpl = mockFetch((method, path) => {
      if (method === 'GET' && path === '/api/deals') {
        return json({ deals: [{ id: 's1', updatedAt: new Date(100).toISOString() }] });
      }
      if (method === 'DELETE' && path === '/api/deals/s1') {
        return json({ ok: true });
      }
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
        return json(
          { deal: { id: 'srv-b', state: state(), updatedAt: new Date(700).toISOString() } },
          201,
        );
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    const controller = makeController(store, fetchImpl);

    await controller.fullSync();
    expect(controller.getStatus().phase).toBe('offline');
    expect(store.pushed).toHaveLength(0); // still queued

    online = true;
    await controller.fullSync();
    expect(store.pushed).toContainEqual({
      localId: 'b',
      serverId: 'srv-b',
      updatedAt: 700,
    });
    expect(controller.getStatus().phase).toBe('idle');
  });

  it('flushes a queued collaborator add once the deal has a server id', async () => {
    const store = new FakeStore({
      deals: [local({ localId: 'a', serverId: 's1', updatedAt: 100 })],
      collabOps: [
        { id: 'co-1', localId: 'a', op: 'add', email: 'x@y.de', role: 'editor' },
      ],
    });
    const posts: unknown[] = [];
    const fetchImpl = mockFetch((method, path, body) => {
      if (method === 'GET' && path === '/api/deals') return json({ deals: [] });
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

describe('SyncController.notifyLocalChange (debounced push)', () => {
  it('coalesces rapid mutations into a single delayed push', async () => {
    jest.useFakeTimers();
    try {
      const store = new FakeStore({
        deals: [local({ localId: 'b', serverId: null, dirty: true })],
      });
      const fetchImpl = mockFetch((method, path) => {
        if (method === 'POST' && path === '/api/deals') {
          return json(
            { deal: { id: 'srv-b', state: state(), updatedAt: new Date(1).toISOString() } },
            201,
          );
        }
        throw new Error(`unexpected ${method} ${path}`);
      });
      const controller = makeController(store, fetchImpl);

      controller.notifyLocalChange();
      controller.notifyLocalChange();
      controller.notifyLocalChange();
      // Nothing fired yet (still within the debounce window).
      expect(fetchImpl).not.toHaveBeenCalled();

      jest.advanceTimersByTime(60);
      // Flush the async push microtasks.
      await Promise.resolve();
      await Promise.resolve();

      // Exactly one POST despite three notifications.
      const posts = fetchImpl.mock.calls.filter(
        (c) => (c[1]?.method ?? 'GET') === 'POST',
      );
      expect(posts).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
