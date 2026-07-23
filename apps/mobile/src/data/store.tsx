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

export function DealsProvider({
  children,
  seeds = SEED_DEALS,
}: {
  children: React.ReactNode;
  seeds?: SeedDeal[];
}) {
  const [query, setQuery] = React.useState('');
  const [sortMode, setSortMode] = React.useState<SortMode>('score');
  // The ordered, mutable list of deals (add / remove / status live here).
  const [seedList, setSeedList] = React.useState<SeedDeal[]>(() =>
    initSeedList(seeds),
  );
  const [states, setStates] = React.useState<Record<string, DealState>>(() =>
    seedStates(seeds),
  );
  const [docs, setDocs] = React.useState<Record<string, DocsState>>(() =>
    seedDocsStates(seeds),
  );
  const [chats, setChats] = React.useState<Record<string, ChatsState>>(() =>
    seedChatsStates(seeds),
  );

  // Re-seed if the seed set itself changes (mainly for tests passing `seeds`).
  React.useEffect(() => {
    setSeedList(initSeedList(seeds));
    setStates(seedStates(seeds));
    setDocs(seedDocsStates(seeds));
    setChats(seedChatsStates(seeds));
  }, [seeds]);

  /** Immutably replace one deal's state. */
  const update = React.useCallback(
    (id: string, fn: (s: DealState) => DealState) => {
      setStates((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: fn(cur) };
      });
    },
    [],
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
        return id;
      },
      deleteDeal: (id) => {
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
      },
      removeCollaborator: (id, collabId) =>
        update(id, (s) => ({
          ...s,
          collaborators: s.collaborators.filter(
            (c) => c.role === 'owner' || c.id !== collabId,
          ),
        })),

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

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
}

export function useDeals(): DealsStore {
  const ctx = React.useContext(DealsContext);
  if (!ctx) {
    throw new Error('useDeals must be used within a <DealsProvider>');
  }
  return ctx;
}
