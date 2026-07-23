/**
 * Local mock deal store (React context — zero extra deps).
 *
 * The store is the single source of truth for every deal's *calc inputs*
 * (`priceByCase`, `scenario`, `financing`, `costs`, assumptions, `measures`,
 * `risks`). All those live as a mutable `Record<id, DealState>`. Nothing derived
 * is stored: pipeline rows and every detail metric are recomputed from the live
 * `DealState` through @dealpilot/core, so an assumption change in the
 * Deal-Detail (Kalkulation) screen immediately re-derives the pipeline row's
 * score / yield too.
 *
 * UI-only flags (active tab, which sheet is open, expand toggles) are NOT stored
 * here — they are local component state in the screens that own them.
 */

import * as React from 'react';
import type {
  Collaborator,
  ContextProposal,
  Costs,
  DealState,
  DealStatus,
  Financing,
  Measure,
  Objektart,
  Risk,
  RiskStatus,
  Scenario,
} from '@dealpilot/core';
import { applyContextProposal, transitionRisk } from '@dealpilot/core';
import {
  SEED_DEALS,
  createSeedDeal,
  type CreateDealInput,
  type SeedDeal,
} from './deals';
import {
  seedDocsState,
  type DealDocument,
  type DocsState,
} from './documents';
import {
  seedChatsState,
  docChatThread,
  NEW_CHAT_INTRO,
  type ChatsState,
} from './chats';
import { deriveTitle, type ChatReply } from '../lib/chat';
import {
  buildSections,
  deriveRows,
  sortRows,
  type DealRowVM,
  type PipelineSection,
  type SortMode,
} from '../lib/pipeline';
import type {
  CollabOp,
  DealSyncMeta,
  SyncStore,
  Tombstone,
} from '../lib/sync';
import type { PersistedSnapshot } from './persistence';

/** Assumption fields (non-financing) editable in the Annahmen-Sheet. */
export type AssumptionPatch = Partial<
  Pick<
    DealState,
    | 'steig'
    | 'wertZuwachs'
    | 'costGrowth'
    | 'gebaeudewert'
    | 'afaSatz'
    | 'steuersatz'
  >
>;

/** Master-data patch saved from the Objektdaten-Sheet (README 7). */
export interface ObjektdatenInput {
  objektart: Objektart;
  /** Straße & Nr. (empty string clears it). */
  address: string;
  ort: string;
  qm: number;
  baujahr: number;
  kaufpreis: number;
  rent: number;
  /** Makler commission as a decimal fraction (0 = provisionsfrei). */
  maklerPct: number;
}

interface DealsStore {
  rows: DealRowVM[];
  query: string;
  setQuery: (q: string) => void;
  sections: PipelineSection[];
  /** Active pipeline sort (⋮ action menu). */
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  getSeed: (id: string) => SeedDeal | undefined;
  getRow: (id: string) => DealRowVM | undefined;

  /** Live, mutable calc state for a deal (undefined for unknown ids). */
  getState: (id: string) => DealState | undefined;

  /** Live, mutable document slice for a deal (undefined for unknown ids). */
  getDocs: (id: string) => DocsState | undefined;

  // --- Mutations (all recompute every derived value live) ---
  setScenario: (id: string, scenario: Scenario) => void;
  /** Set the purchase price for a single scenario (Annahmen discount slider). */
  setScenarioPrice: (id: string, scenario: Scenario, price: number) => void;
  patchFinancing: (id: string, patch: Partial<Financing>) => void;
  patchCosts: (id: string, patch: Partial<Costs>) => void;
  patchAssumptions: (id: string, patch: AssumptionPatch) => void;
  addMeasure: (id: string, measure: Measure) => void;

  // --- Deal lifecycle (create / delete / status / master data) ---
  /** Create a full DealState from the manual form; returns the new deal id. */
  createDeal: (input: CreateDealInput) => string;
  /** Remove a deal (and its doc / chat slices) entirely. */
  deleteDeal: (id: string) => void;
  /** Change the pipeline status (regroups the pipeline). */
  setDealStatus: (id: string, status: DealStatus) => void;
  /**
   * Save Objektdaten. Updating the Kaufpreis resets every scenario price to it
   * (so calc / yield / score reflect the new master price); maklerPct feeds
   * financing. Everything re-derives live.
   */
  updateObjektdaten: (id: string, patch: ObjektdatenInput) => void;

  // --- Collaboration (store-backed, locally simulated) ---
  /** Invite a collaborator (pending) by email + role; returns nothing. */
  addCollaborator: (id: string, email: string, role: 'edit' | 'view') => void;
  /** Remove a collaborator by id (owner can never be removed). */
  removeCollaborator: (id: string, collabId: string | number) => void;

  // --- Risk lifecycle (all delegate to @dealpilot/core's state machine) ---
  /**
   * Move one risk to a new status via core's `transitionRisk`
   * (covered → appliedCost = estimate, accepted/question/open → 0). Throws
   * `InvalidRiskTransitionError` on an illegal transition (e.g. open → open).
   */
  transitionRisk: (id: string, riskId: string, to: RiskStatus) => void;
  /**
   * Apply a wizard context-dialog proposal via core's `applyContextProposal`
   * (lets the proposal override appliedCost and attach a context note).
   */
  applyRiskContext: (
    id: string,
    riskId: string,
    proposal: ContextProposal,
  ) => void;

  // --- Documents (mobile-side; core untouched) ---
  /** Remove a missing document from the checklist (after a KI-Mail request). */
  requestDocument: (id: string, missingId: string) => void;
  /** Add a document to the deal's list, merging by id (skips existing). */
  addDocuments: (id: string, docs: DealDocument[]) => void;

  // --- Multi-chat (mobile-side; core untouched) ---
  /** Live chat slice for a deal (undefined for unknown ids). */
  getChats: (id: string) => ChatsState | undefined;
  /**
   * Append the user's message to the active chat, deriving the chat title from
   * it while the chat is still "Neuer Chat" (see `deriveTitle`). The scripted AI
   * reply is added separately (after the typing delay) via `addAiReply`.
   */
  sendChatMessage: (id: string, text: string) => void;
  /** Append a scripted AI reply to a specific chat thread. */
  addAiReply: (id: string, chatId: string, reply: ChatReply) => void;
  /** Start a fresh empty chat ("Neuer Chat") and make it active. */
  newChat: (id: string) => void;
  /** Switch the active chat thread. */
  setActiveChat: (id: string, chatId: string) => void;
  /**
   * Start a chat linked to a document ("Zum Dokument fragen") and make it
   * active; returns the new chat id (or undefined for unknown deals).
   */
  startDocChat: (id: string, docId: string, docName: string) => string | undefined;
}

const DealsContext = React.createContext<DealsStore | null>(null);

/** Deep-ish clone of the seed states so edits never mutate the module seeds. */
function seedStates(seeds: SeedDeal[]): Record<string, DealState> {
  const out: Record<string, DealState> = {};
  for (const s of seeds) {
    out[s.id] = {
      ...s.state,
      priceByCase: { ...s.state.priceByCase },
      financing: { ...s.state.financing },
      costs: { ...s.state.costs },
      measures: s.state.measures.map((m) => ({ ...m })),
      risks: s.state.risks.map((r) => ({ ...r })),
      collaborators: s.state.collaborators.map((c) => ({ ...c })),
      contact: { ...s.state.contact },
    };
  }
  return out;
}

/** Fresh per-deal document slices keyed by deal id. */
function seedDocsStates(seeds: SeedDeal[]): Record<string, DocsState> {
  const out: Record<string, DocsState> = {};
  for (const s of seeds) out[s.id] = seedDocsState();
  return out;
}

/** Fresh per-deal chat slices keyed by deal id. */
function seedChatsStates(seeds: SeedDeal[]): Record<string, ChatsState> {
  const out: Record<string, ChatsState> = {};
  for (const s of seeds) out[s.id] = seedChatsState(s);
  return out;
}

/** Placeholder KI verdict for a deal pulled from the server (no local analysis). */
const SYNCED_VERDICT =
  'Von einem anderen Gerät synchronisiert. Öffne den Deal, um Kennzahlen zu ' +
  'prüfen oder Unterlagen zu ergänzen.';

/** Fresh sync-meta for the seed deals: unpushed + dirty so a first sync POSTs them. */
function seedSyncMeta(seeds: SeedDeal[], now: number): Record<string, DealSyncMeta> {
  const out: Record<string, DealSyncMeta> = {};
  for (const s of seeds) out[s.id] = { serverId: null, updatedAt: now, dirty: true };
  return out;
}

/** The mutable store slices, assembled from a snapshot (hydrate) or the seeds. */
interface StoreInit {
  seedList: SeedDeal[];
  states: Record<string, DealState>;
  docs: Record<string, DocsState>;
  chats: Record<string, ChatsState>;
  sortMode: SortMode;
  syncMeta: Record<string, DealSyncMeta>;
  tombstones: Tombstone[];
  collabOps: CollabOp[];
}

function buildInit(
  seeds: SeedDeal[],
  snapshot: PersistedSnapshot | null | undefined,
): StoreInit {
  if (snapshot) {
    return {
      seedList: snapshot.seedList,
      states: snapshot.states,
      docs: snapshot.docs,
      chats: snapshot.chats,
      sortMode: snapshot.sortMode,
      syncMeta: snapshot.syncMeta,
      tombstones: snapshot.tombstones,
      collabOps: snapshot.collabOps,
    };
  }
  const list = initSeedList(seeds);
  return {
    seedList: list,
    states: seedStates(seeds),
    docs: seedDocsStates(seeds),
    chats: seedChatsStates(seeds),
    sortMode: 'score',
    syncMeta: seedSyncMeta(list, Date.now()),
    tombstones: [],
    collabOps: [],
  };
}

/** Local role → server collaborator role. */
function serverRole(role: 'edit' | 'view'): 'editor' | 'viewer' {
  return role === 'edit' ? 'editor' : 'viewer';
}

/** Monotonic counter for queued collaborator ops (stable ids in tests). */
let collabOpSeq = 0;

/** Monotonic counter for new chat ids (stable + collision-free in tests). */
let chatSeq = 0;
const nextChatId = (prefix: string) => `${prefix}-${(chatSeq += 1)}`;

/** Monotonic counter for new deal ids (stable + collision-free in tests). */
let dealSeq = 0;

/**
 * Independent, mutable copy of the seed list with a `createdSeq` guaranteed on
 * every entry (array index when the literal omits it) so the "Datum" sort is
 * well-defined and runtime-created deals can always out-rank the seeds.
 */
function initSeedList(seeds: SeedDeal[]): SeedDeal[] {
  return seeds.map((s, i) => ({ ...s, createdSeq: s.createdSeq ?? i }));
}

/** A URL-safe slug from the street/city, used as the readable part of a new id. */
function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'deal';
}

export interface DealsProviderProps {
  children: React.ReactNode;
  seeds?: SeedDeal[];
  /**
   * Hydrate every slice from a persisted snapshot instead of the mock seeds.
   * When absent/null the store seeds the mock deals (first run).
   */
  initialSnapshot?: PersistedSnapshot | null;
  /**
   * Called on every persisted-slice change with the full snapshot to save.
   * The caller (root layout) debounces the actual AsyncStorage write. Omitted
   * in tests → the store has no persistence side effects.
   */
  onPersist?: (snapshot: PersistedSnapshot) => void;
  /**
   * Receives the sync-store adapter once, so a SyncController can pull/push the
   * deals against the API. Omitted in tests → no sync.
   */
  bindSyncStore?: (store: SyncStore) => void;
  /** Called after each sync-relevant local mutation, to debounce a push. */
  onLocalChange?: () => void;
}

export function DealsProvider({
  children,
  seeds = SEED_DEALS,
  initialSnapshot,
  onPersist,
  bindSyncStore,
  onLocalChange,
}: DealsProviderProps) {
  const init = React.useRef(buildInit(seeds, initialSnapshot)).current;

  const [query, setQuery] = React.useState('');
  const [sortMode, setSortMode] = React.useState<SortMode>(init.sortMode);
  // The ordered, mutable list of deals (add / remove / status live here).
  const [seedList, setSeedList] = React.useState<SeedDeal[]>(init.seedList);
  const [states, setStates] = React.useState<Record<string, DealState>>(
    init.states,
  );
  const [docs, setDocs] = React.useState<Record<string, DocsState>>(init.docs);
  const [chats, setChats] = React.useState<Record<string, ChatsState>>(
    init.chats,
  );
  // Sync bookkeeping (server id / last-modified / dirty per deal, plus the
  // delete tombstones and queued collaborator ops). Kept out of the render VM.
  const [syncMeta, setSyncMeta] = React.useState<Record<string, DealSyncMeta>>(
    init.syncMeta,
  );
  const [tombstones, setTombstones] = React.useState<Tombstone[]>(
    init.tombstones,
  );
  const [collabOps, setCollabOps] = React.useState<CollabOp[]>(init.collabOps);

  // Latest-value refs so the async SyncController adapter reads current data.
  const seedListRef = React.useRef(seedList);
  const statesRef = React.useRef(states);
  const syncMetaRef = React.useRef(syncMeta);
  const tombstonesRef = React.useRef(tombstones);
  const collabOpsRef = React.useRef(collabOps);
  seedListRef.current = seedList;
  statesRef.current = states;
  syncMetaRef.current = syncMeta;
  tombstonesRef.current = tombstones;
  collabOpsRef.current = collabOps;

  const onLocalChangeRef = React.useRef(onLocalChange);
  onLocalChangeRef.current = onLocalChange;

  /** Mark a deal as locally changed (bump updatedAt + dirty) and nudge sync. */
  const touchSync = React.useCallback((id: string) => {
    setSyncMeta((prev) => {
      const cur = prev[id] ?? { serverId: null, updatedAt: 0, dirty: false };
      return { ...prev, [id]: { ...cur, updatedAt: Date.now(), dirty: true } };
    });
    onLocalChangeRef.current?.();
  }, []);

  // Re-seed only when the `seeds` prop itself changes *after* mount (mainly for
  // tests). The initial slices already come from `buildInit`, so we skip the
  // first run to avoid clobbering a hydrated snapshot.
  const seededOnce = React.useRef(false);
  React.useEffect(() => {
    if (!seededOnce.current) {
      seededOnce.current = true;
      return;
    }
    if (initialSnapshot) return; // snapshot-driven store is never re-seeded
    const list = initSeedList(seeds);
    setSeedList(list);
    setStates(seedStates(seeds));
    setDocs(seedDocsStates(seeds));
    setChats(seedChatsStates(seeds));
    setSyncMeta(seedSyncMeta(list, Date.now()));
    setTombstones([]);
    setCollabOps([]);
  }, [seeds, initialSnapshot]);

  /** Immutably replace one deal's state (and mark it dirty for sync). */
  const update = React.useCallback(
    (id: string, fn: (s: DealState) => DealState) => {
      setStates((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: fn(cur) };
      });
      touchSync(id);
    },
    [touchSync],
  );

  /** Immutably replace one deal's document slice. */
  const updateDocs = React.useCallback(
    (id: string, fn: (d: DocsState) => DocsState) => {
      setDocs((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: fn(cur) };
      });
    },
    [],
  );

  /** Immutably replace one deal's chat slice. */
  const updateChats = React.useCallback(
    (id: string, fn: (c: ChatsState) => ChatsState) => {
      setChats((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: fn(cur) };
      });
    },
    [],
  );

  // Rebuild SeedDeal-shaped entries with the *live* state so the pipeline
  // reflects edits (score/yield), then derive + sort rows and build sections
  // via core. Sorting happens before grouping so section order stays fixed.
  const liveSeeds = React.useMemo<SeedDeal[]>(
    () => seedList.map((s) => ({ ...s, state: states[s.id] ?? s.state })),
    [seedList, states],
  );
  const rows = React.useMemo(
    () => sortRows(deriveRows(liveSeeds), sortMode),
    [liveSeeds, sortMode],
  );
  const sections = React.useMemo(
    () => buildSections(rows, query),
    [rows, query],
  );

  const value = React.useMemo<DealsStore>(
    () => ({
      rows,
      query,
      setQuery,
      sections,
      sortMode,
      setSortMode,
      getSeed: (id) => seedList.find((s) => s.id === id),
      getRow: (id) => rows.find((r) => r.id === id),
      getState: (id) => states[id],
      getDocs: (id) => docs[id],
      getChats: (id) => chats[id],

      setScenario: (id, scenario) => update(id, (s) => ({ ...s, scenario })),
      setScenarioPrice: (id, scenario, price) =>
        update(id, (s) => ({
          ...s,
          priceByCase: { ...s.priceByCase, [scenario]: price },
        })),
      patchFinancing: (id, patch) =>
        update(id, (s) => ({ ...s, financing: { ...s.financing, ...patch } })),
      patchCosts: (id, patch) =>
        update(id, (s) => ({ ...s, costs: { ...s.costs, ...patch } })),
      patchAssumptions: (id, patch) => update(id, (s) => ({ ...s, ...patch })),
      addMeasure: (id, measure) =>
        update(id, (s) => ({ ...s, measures: [...s.measures, measure] })),

      createDeal: (input) => {
        const id = `${slugify(input.address || input.ort)}-${(dealSeq += 1)}`;
        const createdSeq =
          seedList.reduce((m, s) => Math.max(m, s.createdSeq ?? 0), 0) + 1;
        const seed = createSeedDeal(id, input, createdSeq);
        setSeedList((prev) => [...prev, seed]);
        setStates((prev) => ({ ...prev, [id]: seed.state }));
        // New deals start with no documents / chats (the Docs & Chat tabs show
        // their empty-state stubs until the user uploads something).
        // Register sync meta: unpushed + dirty so the next sync POSTs it.
        setSyncMeta((prev) => ({
          ...prev,
          [id]: { serverId: null, updatedAt: Date.now(), dirty: true },
        }));
        onLocalChangeRef.current?.();
        return id;
      },
      deleteDeal: (id) => {
        // Record a tombstone (with the server id, if any) so a later pull can't
        // resurrect the deal; the sync engine issues the server DELETE.
        const serverId = syncMetaRef.current[id]?.serverId ?? null;
        setTombstones((prev) =>
          prev.some((t) => t.localId === id)
            ? prev
            : [...prev, { localId: id, serverId }],
        );
        setSyncMeta((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setCollabOps((prev) => prev.filter((o) => o.localId !== id));
        setSeedList((prev) => prev.filter((s) => s.id !== id));
        setStates((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setDocs((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setChats((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        onLocalChangeRef.current?.();
      },
      setDealStatus: (id, status) =>
        update(id, (s) => ({ ...s, deal: { ...s.deal, dealStatus: status } })),
      updateObjektdaten: (id, patch) =>
        update(id, (s) => ({
          ...s,
          deal: {
            ...s.deal,
            objektart: patch.objektart,
            address: patch.address.trim() ? patch.address.trim() : undefined,
            ort: patch.ort.trim(),
            qm: patch.qm,
            baujahr: patch.baujahr,
            kaufpreis: patch.kaufpreis,
            rent: patch.rent,
          },
          // Editing the master price resets every scenario price to it so calc,
          // yield and score reflect the new number immediately.
          priceByCase: {
            base: patch.kaufpreis,
            bull: patch.kaufpreis,
            bear: patch.kaufpreis,
          },
          financing: { ...s.financing, maklerPct: patch.maklerPct },
        })),

      addCollaborator: (id, email, role) => {
        const trimmed = email.trim();
        if (!trimmed) return;
        const name = trimmed
          .split('@')[0]!
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (m) => m.toUpperCase());
        const collaborator: Collaborator = {
          id: `c-${(dealSeq += 1)}`,
          name,
          email: trimmed,
          role,
          pending: true,
        };
        update(id, (s) => ({
          ...s,
          collaborators: [...s.collaborators, collaborator],
        }));
        // Collaboration is inherently server-side (the API grants access by
        // account email). Queue the invite for the collaborators endpoint;
        // offline → it stays queued and retries on the next sync.
        setCollabOps((prev) => [
          ...prev,
          {
            id: `co-${(collabOpSeq += 1)}`,
            localId: id,
            op: 'add',
            email: trimmed,
            role: serverRole(role),
          },
        ]);
        onLocalChangeRef.current?.();
      },
      removeCollaborator: (id, collabId) => {
        // Look up the removed collaborator's email (the server endpoint keys on
        // email) before we drop them from local state.
        const target = statesRef.current[id]?.collaborators.find(
          (c) => c.id === collabId,
        );
        update(id, (s) => ({
          ...s,
          collaborators: s.collaborators.filter(
            (c) => c.role === 'owner' || c.id !== collabId,
          ),
        }));
        if (target?.email) {
          setCollabOps((prev) => [
            ...prev,
            {
              id: `co-${(collabOpSeq += 1)}`,
              localId: id,
              op: 'remove',
              email: target.email,
            },
          ]);
          onLocalChangeRef.current?.();
        }
      },

      transitionRisk: (id, riskId, to) =>
        update(id, (s) => ({
          ...s,
          risks: s.risks.map((r: Risk) =>
            r.id === riskId ? transitionRisk(r, to) : r,
          ),
        })),
      applyRiskContext: (id, riskId, proposal) =>
        update(id, (s) => ({
          ...s,
          risks: s.risks.map((r: Risk) =>
            r.id === riskId ? applyContextProposal(r, proposal) : r,
          ),
        })),

      requestDocument: (id, missingId) =>
        updateDocs(id, (d) => ({
          ...d,
          missing: d.missing.filter((m) => m.id !== missingId),
        })),
      addDocuments: (id, incoming) =>
        updateDocs(id, (d) => {
          const known = new Set(d.present.map((p) => p.id));
          const added = incoming.filter((doc) => !known.has(doc.id));
          if (added.length === 0) return d;
          return { ...d, present: [...d.present, ...added] };
        }),

      sendChatMessage: (id, text) => {
        const t = text.trim();
        if (!t) return;
        updateChats(id, (c) => ({
          ...c,
          threads: c.threads.map((thread) =>
            thread.id === c.activeChatId
              ? {
                  ...thread,
                  title: deriveTitle(thread.title, t),
                  msgs: [...thread.msgs, { role: 'user', text: t, source: '' }],
                }
              : thread,
          ),
        }));
      },
      addAiReply: (id, chatId, reply) =>
        updateChats(id, (c) => ({
          ...c,
          threads: c.threads.map((thread) =>
            thread.id === chatId
              ? { ...thread, msgs: [...thread.msgs, { role: 'ai', ...reply }] }
              : thread,
          ),
        })),
      newChat: (id) => {
        const newId = nextChatId('neu');
        updateChats(id, (c) => ({
          activeChatId: newId,
          threads: [
            {
              id: newId,
              title: 'Neuer Chat',
              linked: null,
              msgs: [{ role: 'ai', text: NEW_CHAT_INTRO, source: '' }],
            },
            ...c.threads,
          ],
        }));
      },
      setActiveChat: (id, chatId) =>
        updateChats(id, (c) => ({ ...c, activeChatId: chatId })),
      startDocChat: (id, docId, docName) => {
        if (!chats[id]) return undefined;
        const newId = nextChatId('doc');
        updateChats(id, (c) => ({
          activeChatId: newId,
          threads: [docChatThread(newId, docId, docName), ...c.threads],
        }));
        return newId;
      },
    }),
    [
      rows,
      query,
      sections,
      sortMode,
      seedList,
      states,
      docs,
      chats,
      update,
      updateDocs,
      updateChats,
    ],
  );

  // ---- Sync adapter: lets a SyncController read/write these slices ----------
  // Reads go through the latest-value refs; writes go through setState. Writes
  // here are server-originated (pull / push-ack) so they clear dirty and never
  // re-nudge the push loop.
  const syncStore = React.useMemo<SyncStore>(
    () => ({
      getLocalDeals: () =>
        seedListRef.current.map((s) => {
          const m = syncMetaRef.current[s.id] ?? {
            serverId: null,
            updatedAt: 0,
            dirty: false,
          };
          return {
            localId: s.id,
            serverId: m.serverId,
            state: statesRef.current[s.id] ?? s.state,
            updatedAt: m.updatedAt,
            dirty: m.dirty,
          };
        }),
      getTombstones: () => tombstonesRef.current,
      getCollabOps: () => collabOpsRef.current,
      applyServerDeal: (serverId, serverState, updatedAt) => {
        const existingId = Object.keys(syncMetaRef.current).find(
          (localId) => syncMetaRef.current[localId]?.serverId === serverId,
        );
        if (existingId) {
          setStates((prev) => ({ ...prev, [existingId]: serverState }));
          setSeedList((prev) =>
            prev.map((s) =>
              s.id === existingId ? { ...s, state: serverState } : s,
            ),
          );
          setSyncMeta((prev) => ({
            ...prev,
            [existingId]: { serverId, updatedAt, dirty: false },
          }));
          return;
        }
        // Unknown locally → materialize a SeedDeal keyed by the server id.
        const createdSeq =
          seedListRef.current.reduce(
            (m, s) => Math.max(m, s.createdSeq ?? 0),
            0,
          ) + 1;
        const seed: SeedDeal = {
          id: serverId,
          state: serverState,
          verdict: SYNCED_VERDICT,
          scoreBreakdown: { rendite: 60, lage: 60, objekt: 55 },
          createdSeq,
        };
        setSeedList((prev) =>
          prev.some((s) => s.id === serverId) ? prev : [...prev, seed],
        );
        setStates((prev) => ({ ...prev, [serverId]: serverState }));
        setSyncMeta((prev) => ({
          ...prev,
          [serverId]: { serverId, updatedAt, dirty: false },
        }));
      },
      markPushed: (localId, serverId, updatedAt) =>
        setSyncMeta((prev) =>
          prev[localId]
            ? { ...prev, [localId]: { serverId, updatedAt, dirty: false } }
            : prev,
        ),
      removeTombstone: (localId) =>
        setTombstones((prev) => prev.filter((t) => t.localId !== localId)),
      removeCollabOp: (opId) =>
        setCollabOps((prev) => prev.filter((o) => o.id !== opId)),
    }),
    [],
  );

  // Hand the adapter to the caller (root layout) once.
  const bindSyncStoreRef = React.useRef(bindSyncStore);
  bindSyncStoreRef.current = bindSyncStore;
  React.useEffect(() => {
    bindSyncStoreRef.current?.(syncStore);
  }, [syncStore]);

  // Persist every serialized slice on change (the caller debounces the write).
  const onPersistRef = React.useRef(onPersist);
  onPersistRef.current = onPersist;
  React.useEffect(() => {
    onPersistRef.current?.({
      version: 1,
      seedList,
      states,
      docs,
      chats,
      sortMode,
      syncMeta,
      tombstones,
      collabOps,
    });
  }, [seedList, states, docs, chats, sortMode, syncMeta, tombstones, collabOps]);

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
}

export function useDeals(): DealsStore {
  const ctx = React.useContext(DealsContext);
  if (!ctx) {
    throw new Error('useDeals must be used within a <DealsProvider>');
  }
  return ctx;
}
