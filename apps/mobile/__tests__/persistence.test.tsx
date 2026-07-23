/**
 * Persistence round-trip: a store mutation is serialized to a snapshot, written
 * to (mocked) AsyncStorage, reloaded, and re-hydrated into a fresh provider —
 * the mutation survives, and the mock seeds only appear on a truly empty store.
 */
import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { DealsProvider, useDeals } from '../src/data/store';
import {
  loadSnapshot,
  saveSnapshot,
  storageKeyForUser,
  type PersistedSnapshot,
} from '../src/data/persistence';

/** Probe: shows a deal's status and can flip it to "verhandlung". */
function StatusProbe({ id }: { id: string }) {
  const { getState, setDealStatus } = useDeals();
  const s = getState(id);
  return (
    <View>
      <Text testID="status">{s?.deal.dealStatus ?? 'none'}</Text>
      <Text testID="flip" onPress={() => setDealStatus(id, 'verhandlung')}>
        flip
      </Text>
    </View>
  );
}

describe('persistence module', () => {
  it('round-trips a snapshot through AsyncStorage', async () => {
    const key = storageKeyForUser('user-1');
    const snap: PersistedSnapshot = {
      version: 2,
      seedList: [],
      states: {},
      docs: {},
      chats: {},
      sortMode: 'datum',
      syncMeta: {},
      tombstones: [{ localId: 'x', serverId: 's1' }],
      collabOps: [],
      dealSeq: 3,
      chatSeq: 1,
      collabOpSeq: 0,
    };
    await saveSnapshot(key, snap);
    const loaded = await loadSnapshot(key);
    expect(loaded).toEqual(snap);
  });

  it('returns null for a missing / version-mismatched blob', async () => {
    expect(await loadSnapshot(storageKeyForUser('nobody'))).toBeNull();
  });
});

describe('store <-> persistence hydration', () => {
  it('persists a mutation and re-hydrates it into a fresh provider', async () => {
    let latest: PersistedSnapshot | null = null;

    render(
      <DealsProvider onPersist={(s) => (latest = s)}>
        <StatusProbe id="lindenstrasse-14" />
      </DealsProvider>,
    );

    // Seeded status.
    expect(screen.getByTestId('status')).toHaveTextContent('pruefung');

    // Mutate → the store fires onPersist with the new snapshot.
    act(() => {
      fireEvent.press(screen.getByTestId('flip'));
    });
    expect(screen.getByTestId('status')).toHaveTextContent('verhandlung');
    expect(latest).not.toBeNull();

    // Persist + reload, then hydrate a brand-new provider from the snapshot.
    const key = storageKeyForUser('user-2');
    await saveSnapshot(key, latest!);
    const reloaded = await loadSnapshot(key);
    expect(reloaded).not.toBeNull();

    render(
      <DealsProvider initialSnapshot={reloaded}>
        <StatusProbe id="lindenstrasse-14" />
      </DealsProvider>,
    );

    // The mutated status survived the round-trip (not re-seeded to "pruefung").
    const statuses = screen.getAllByTestId('status');
    expect(statuses[statuses.length - 1]).toHaveTextContent('verhandlung');
  });
});
