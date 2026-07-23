/**
 * Local mock deal store (React context — zero extra deps).
 *
 * The seed deals are static; the only mutable state is the search query. Rows
 * are derived once from the seeds (via core) and memoised; sections are rebuilt
 * whenever the query changes.
 */

import * as React from 'react';
import { SEED_DEALS, type SeedDeal } from './deals';
import {
  buildSections,
  deriveRows,
  type DealRowVM,
  type PipelineSection,
} from '../lib/pipeline';

interface DealsStore {
  rows: DealRowVM[];
  query: string;
  setQuery: (q: string) => void;
  sections: PipelineSection[];
  getSeed: (id: string) => SeedDeal | undefined;
  getRow: (id: string) => DealRowVM | undefined;
}

const DealsContext = React.createContext<DealsStore | null>(null);

export function DealsProvider({
  children,
  seeds = SEED_DEALS,
}: {
  children: React.ReactNode;
  seeds?: SeedDeal[];
}) {
  const [query, setQuery] = React.useState('');

  const rows = React.useMemo(() => deriveRows(seeds), [seeds]);
  const sections = React.useMemo(() => buildSections(rows, query), [rows, query]);

  const value = React.useMemo<DealsStore>(
    () => ({
      rows,
      query,
      setQuery,
      sections,
      getSeed: (id) => seeds.find((s) => s.id === id),
      getRow: (id) => rows.find((r) => r.id === id),
    }),
    [rows, query, sections, seeds],
  );

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
}

export function useDeals(): DealsStore {
  const ctx = React.useContext(DealsContext);
  if (!ctx) {
    throw new Error('useDeals must be used within a <DealsProvider>');
  }
  return ctx;
}
