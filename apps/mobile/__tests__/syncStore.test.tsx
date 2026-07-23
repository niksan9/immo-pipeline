/**
 * Store <-> sync-adapter behaviour tests. These exercise the store-side half of
 * the sync engine (the {@link SyncStore} adapter + sync bookkeeping) that the
 * fetch-mocking engine tests can't reach: seed deals must never be pushed, id
 * counters must survive a restart, the lost-update generation guard, and
 * server-authoritative deletion. They drive the real React store, not a mock.
 */
import * as React from 'react';
import { act, render } from '@testing-library/react-native';

import { DealsProvider, useDeals } from '../src/data/store';
import { planPush, type SyncStore } from '../src/lib/sync';
import type { PersistedSnapshot } from '../src/data/persistence';
import type { CreateDealInput } from '../src/data/deals';

const INPUT: CreateDealInput = {
  objektart: 'ETW',
  address: 'Teststraße 1',
  plz: '04103',
  ort: 'Testort',
  vermietet: 'vermietet',
  kaufpreis: 200000,
  qm: 70,
  rent: 700,
};

/** Render the store, exposing the live {@link DealsStore} API + sync adapter. */
function renderStore(snapshot?: PersistedSnapshot | null) {
  const ref: {
    api: ReturnType<typeof useDeals> | null;
    sync: SyncStore | null;
    lastSnapshot: PersistedSnapshot | null;
  } = { api: null, sync: null, lastSnapshot: null };

  function Capture() {
    ref.api = useDeals();
    return null;
  }

  render(
    <DealsProvider
      initialSnapshot={snapshot ?? undefined}
      bindSyncStore={(s) => {
        ref.sync = s;
      }}
      onPersist={(snap) => {
        ref.lastSnapshot = snap;
      }}
    >
      <Capture />
    </DealsProvider>,
  );
  return ref;
}

describe('seed deals are never auto-pushed', () => {
  it('leaves every seeded deal clean (dirty:false) → planPush POSTs nothing', () => {
    const ref = renderStore();
    const locals = ref.sync!.getLocalDeals();
    expect(locals.length).toBeGreaterThan(0);
    expect(locals.every((d) => d.serverId === null && d.dirty === false)).toBe(true);
    const plan = planPush(locals, ref.sync!.getTombstones());
    expect(plan.post).toHaveLength(0);
  });

  it('POSTs a user-created deal (dirty:true)', () => {
    const ref = renderStore();
    let id = '';
    act(() => {
      id = ref.api!.createDeal(INPUT);
    });
    const created = ref.sync!.getLocalDeals().find((d) => d.localId === id)!;
    expect(created.dirty).toBe(true);
    expect(created.serverId).toBeNull();
    const plan = planPush(ref.sync!.getLocalDeals(), ref.sync!.getTombstones());
    expect(plan.post.map((d) => d.localId)).toEqual([id]);
  });

  it('promotes a seed to a synced deal once the user edits it', () => {
    const ref = renderStore();
    const seedId = 'lindenstrasse-14';
    act(() => {
      ref.api!.setDealStatus(seedId, 'verhandlung');
    });
    const edited = ref.sync!.getLocalDeals().find((d) => d.localId === seedId)!;
    expect(edited.dirty).toBe(true); // touchSync promoted the demo deal
    const plan = planPush(ref.sync!.getLocalDeals(), ref.sync!.getTombstones());
    expect(plan.post.map((d) => d.localId)).toContain(seedId);
  });
});

describe('id counters survive a simulated restart', () => {
  it('a deal created after restart does not collide with a pre-restart id', () => {
    // First session: create a deal, capture the persisted snapshot.
    const first = renderStore();
    let firstId = '';
    act(() => {
      firstId = first.api!.createDeal(INPUT);
    });
    // Slug derives from the address; only the trailing counter matters here.
    expect(firstId).toBe('teststrasse-1-1');
    const snapshot = first.lastSnapshot!;
    expect(snapshot.dealSeq).toBe(1);

    // Second session: hydrate from the snapshot (fresh module-level state would
    // have reset a module counter to 0 → '…-1' again → collision).
    const second = renderStore(snapshot);
    let secondId = '';
    act(() => {
      secondId = second.api!.createDeal(INPUT);
    });
    expect(secondId).toBe('teststrasse-1-2');
    expect(secondId).not.toBe(firstId);
  });

  it('a tombstoned id is not reused to shadow a new deal', () => {
    const first = renderStore();
    let deletedId = '';
    act(() => {
      deletedId = first.api!.createDeal(INPUT);
    });
    act(() => {
      first.api!.deleteDeal(deletedId);
    });
    const snapshot = first.lastSnapshot!;
    // The deleted id lives on as a tombstone.
    expect(snapshot.tombstones.map((t) => t.localId)).toContain(deletedId);

    const second = renderStore(snapshot);
    let newId = '';
    act(() => {
      newId = second.api!.createDeal(INPUT);
    });
    expect(newId).not.toBe(deletedId); // counter continued past the tombstone
    // The new deal is visible (not shadowed by the tombstone in planPush).
    const plan = planPush(second.sync!.getLocalDeals(), second.sync!.getTombstones());
    expect(plan.post.map((d) => d.localId)).toContain(newId);
  });
});

describe('addDocuments clears a fulfilled missing entry', () => {
  it('advances the DD fraction (present+1, missing−1) instead of growing total', () => {
    const ref = renderStore();
    const id = 'lindenstrasse-14';

    const before = ref.api!.getDocs(id)!;
    const presentBefore = before.present.length; // 7
    const missingBefore = before.missing.length; // 4
    const totalBefore = presentBefore + missingBefore;
    // The seeded checklist still lists "Energieausweis" as missing.
    expect(before.missing.map((m) => m.id)).toContain('energieausweis');

    // Add a document whose id matches that missing entry.
    act(() => {
      ref.api!.addDocuments(id, [
        {
          id: 'energieausweis',
          name: 'Energieausweis',
          category: 'Energieausweis',
          status: 'unauffaellig',
          badge: 'ok',
          note: 'Verbrauchsausweis · Klasse D',
          summary: 'Energieausweis vorhanden; keine Auffälligkeiten.',
          pages: 2,
        },
      ]);
    });

    const after = ref.api!.getDocs(id)!;
    expect(after.present.length).toBe(presentBefore + 1); // now present
    expect(after.missing.length).toBe(missingBefore - 1); // no longer missing
    expect(after.missing.map((m) => m.id)).not.toContain('energieausweis');
    // Total (present + missing) is unchanged → no double-count / inflation.
    expect(after.present.length + after.missing.length).toBe(totalBefore);
  });
});

describe('addCollaborator uses its own id counter', () => {
  it('does not advance the deal-id sequence when inviting a collaborator', () => {
    const ref = renderStore();
    const id = 'lindenstrasse-14';

    // Invite a collaborator, then create a deal: the new deal id must still be
    // "-1" (dealSeq untouched by the collaborator), and collabSeq is its own.
    act(() => {
      ref.api!.addCollaborator(id, 'max.mustermann@example.com', 'edit');
    });
    expect(ref.lastSnapshot!.collabSeq).toBe(1);
    expect(ref.lastSnapshot!.dealSeq).toBe(0); // collaborator did NOT bump dealSeq

    let newId = '';
    act(() => {
      newId = ref.api!.createDeal(INPUT);
    });
    // First-ever created deal → trailing counter "-1" (would be "-2" if the
    // collaborator had reused dealSeq).
    expect(newId).toBe('teststrasse-1-1');

    // A second collaborator continues the collab counter independently.
    act(() => {
      ref.api!.addCollaborator(id, 'erika.musterfrau@example.com', 'view');
    });
    expect(ref.lastSnapshot!.collabSeq).toBe(2);
  });
});

describe('markPushed lost-update generation guard', () => {
  it('keeps dirty when a local edit landed since the captured revision', () => {
    let clock = 1000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      const ref = renderStore();
      let id = '';
      act(() => {
        id = ref.api!.createDeal(INPUT); // dirty, updatedAt = 1000
      });
      const captured = ref.sync!.getLocalDeals().find((d) => d.localId === id)!;
      expect(captured.updatedAt).toBe(1000);

      // A newer local edit lands (updatedAt → 2000) before the push acks.
      clock = 2000;
      act(() => {
        ref.api!.setDealStatus(id, 'verhandlung');
      });

      // Push ack carries the STALE captured revision (1000).
      act(() => {
        ref.sync!.markPushed(id, 'srv-1', new Date(500).toISOString(), captured.updatedAt);
      });

      const after = ref.sync!.getLocalDeals().find((d) => d.localId === id)!;
      expect(after.serverId).toBe('srv-1'); // serverId bound
      expect(after.baseUpdatedAt).toBe(new Date(500).toISOString()); // baseline advanced
      expect(after.dirty).toBe(true); // NOT cleared → the newer edit re-syncs
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('clears dirty when no edit landed (captured revision still current)', () => {
    let clock = 1000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      const ref = renderStore();
      let id = '';
      act(() => {
        id = ref.api!.createDeal(INPUT);
      });
      const captured = ref.sync!.getLocalDeals().find((d) => d.localId === id)!;

      act(() => {
        ref.sync!.markPushed(id, 'srv-1', new Date(500).toISOString(), captured.updatedAt);
      });

      const after = ref.sync!.getLocalDeals().find((d) => d.localId === id)!;
      expect(after.serverId).toBe('srv-1');
      expect(after.dirty).toBe(false); // clean push, no intervening edit
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe('dropLocalDeal (server-authoritative deletion)', () => {
  it('removes the deal from every slice with no tombstone', () => {
    const ref = renderStore();
    // Materialize a deal that has a serverId (as if pulled from the server).
    const serverIso = new Date(1000).toISOString();
    act(() => {
      ref.sync!.applyServerDeal('server-xyz', ref.api!.getState('suedplatz-7')!, serverIso);
    });
    expect(ref.sync!.getLocalDeals().some((d) => d.serverId === 'server-xyz')).toBe(true);

    act(() => {
      ref.sync!.dropLocalDeal('server-xyz');
    });

    expect(ref.sync!.getLocalDeals().some((d) => d.localId === 'server-xyz')).toBe(false);
    expect(ref.api!.getRow('server-xyz')).toBeUndefined();
    // No tombstone: the server already deleted it, nothing to DELETE back.
    expect(ref.sync!.getTombstones().some((t) => t.localId === 'server-xyz')).toBe(false);
  });
});
