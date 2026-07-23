/**
 * Sync-status context — surfaces the {@link SyncController}'s live status to the
 * UI (the profile screen's indicator) without threading it through props.
 */
import * as React from 'react';
import type { SyncStatus } from './sync';

const DEFAULT: SyncStatus = { phase: 'idle', lastSyncAt: null, pending: 0 };

export const SyncStatusContext = React.createContext<SyncStatus>(DEFAULT);

export function useSyncStatus(): SyncStatus {
  return React.useContext(SyncStatusContext);
}
