/**
 * Device persistence for the deal store (offline-first).
 *
 * The whole store — deal list, per-deal DealStates, docs & chats slices, the
 * active sort, and the sync bookkeeping (per-deal meta, tombstones, queued
 * collaborator ops) — is serialized to AsyncStorage under a PER-USER key, so
 * two accounts on the same device never see each other's data and everything
 * survives an app restart with no network.
 *
 * Writes are best-effort and fire-and-forget: a failed persist must never break
 * a mutation. Reads fail closed (a corrupt/partial blob → treat as empty → the
 * store seeds fresh mock deals).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DealState } from "@dealpilot/core";
import type { SeedDeal } from "./deals";
import type { DocsState } from "./documents";
import type { ChatsState } from "./chats";
import type { SortMode } from "../lib/pipeline";
import type { CollabOp, DealSyncMeta, Tombstone } from "../lib/sync";

/**
 * Bump when the shape changes incompatibly (older blobs are then ignored).
 *
 * v2: added persisted id counters (`dealSeq`/`chatSeq`/`collabOpSeq`) and the
 * per-deal server baseline (`DealSyncMeta.baseUpdatedAt`). v1 blobs are dropped
 * on purpose — their seed sync-meta was `dirty:true`, which under the old engine
 * would have POSTed demo deals into the real account; discarding them is safe
 * (the store re-seeds fresh, non-dirty demo data).
 */
const SNAPSHOT_VERSION = 2 as const;

const KEY_PREFIX = "dealpilot:store:";

/** Per-user storage key. Namespacing keeps accounts isolated on one device. */
export function storageKeyForUser(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/** The full serialized store. */
export interface PersistedSnapshot {
  version: typeof SNAPSHOT_VERSION;
  seedList: SeedDeal[];
  states: Record<string, DealState>;
  docs: Record<string, DocsState>;
  chats: Record<string, ChatsState>;
  sortMode: SortMode;
  syncMeta: Record<string, DealSyncMeta>;
  tombstones: Tombstone[];
  collabOps: CollabOp[];
  /** Monotonic id counters, persisted so ids stay unique across app restarts. */
  dealSeq: number;
  chatSeq: number;
  collabOpSeq: number;
  /**
   * Collaborator id counter. Optional so pre-existing v2 blobs (written before
   * collaborators got their own sequence) still load — the store falls back to
   * 0. Distinct from `dealSeq`: minting a collaborator must not advance the
   * deal-id sequence.
   */
  collabSeq?: number;
}

/** Load a user's snapshot, or null when absent/corrupt (→ first run → seed). */
export async function loadSnapshot(
  key: string,
): Promise<PersistedSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (parsed?.version !== SNAPSHOT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a user's snapshot (best-effort; swallows errors). */
export async function saveSnapshot(
  key: string,
  snapshot: PersistedSnapshot,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; a failed write must not surface to the UI.
  }
}

/**
 * Remove a user's snapshot. NOT called on sign-out (sign-out clears the session
 * only, leaving local data intact for the next login), but provided for tests /
 * an explicit "reset local data" affordance.
 */
export async function clearSnapshot(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}
