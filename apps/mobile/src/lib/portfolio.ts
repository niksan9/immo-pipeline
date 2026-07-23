/**
 * Portfolio-level aggregation (pipeline header "4b").
 *
 * Pure, framework-free selectors that roll the individual deals up into the
 * three header KPIs shown above the list:
 *   - Gesamtwert  = Σ Kaufpreis over the ACTIVE deals,
 *   - Cashflow/M  = Σ each active deal's BASE-case monthly cashflow (via core),
 *   - offene Risiken = Σ still-open risks over the active deals.
 *
 * "Active" = the three working statuses (Neu · In Prüfung · Verhandlung).
 * `verworfen` (dropped) and `gekauft` (already bought) are deliberately
 * EXCLUDED — the header describes the deals still on the table. Everything is a
 * pure function of the deal states, so the header re-derives live whenever a
 * price / assumption / risk changes (same as the pipeline rows).
 */

import { calc, isResolved, type DealStatus } from '@dealpilot/core';
import type { SeedDeal } from '../data/deals';

/** Statuses that count towards the portfolio KPIs (working deals only). */
export const ACTIVE_STATUSES: readonly DealStatus[] = [
  'neu',
  'pruefung',
  'verhandlung',
];

/** True when a deal's status is one of the active (working) statuses. */
export function isActiveStatus(status: DealStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Aggregated portfolio KPIs shown in the pipeline header. */
export interface PortfolioMetrics {
  /** Number of active deals (drives the "N DEALS" pill). */
  activeCount: number;
  /** Σ Kaufpreis over active deals (EUR). */
  gesamtwert: number;
  /** Σ BASE-case monthly cashflow (pre-tax) over active deals (EUR/month). */
  baseCashflowSum: number;
  /** Σ still-open risks over active deals. */
  openRiskSum: number;
}

/** Count of still-open (unresolved) risks in a deal state. */
function openRiskCount(state: SeedDeal['state']): number {
  return state.risks.filter((r) => !isResolved(r.status)).length;
}

/**
 * Roll the deal list up into the header KPIs. Only active deals contribute;
 * the base-case cashflow forces the `base` scenario regardless of the deal's
 * currently selected scenario (Bull/Bear must not leak into the portfolio
 * number), computed through @dealpilot/core so it stays consistent with the
 * Deal-Detail cashflow hero.
 */
export function computePortfolio(seeds: SeedDeal[]): PortfolioMetrics {
  let activeCount = 0;
  let gesamtwert = 0;
  let baseCashflowSum = 0;
  let openRiskSum = 0;

  for (const { state } of seeds) {
    if (!isActiveStatus(state.deal.dealStatus)) continue;
    activeCount += 1;
    gesamtwert += state.deal.kaufpreis;
    baseCashflowSum += calc({ ...state, scenario: 'base' }).cashflow;
    openRiskSum += openRiskCount(state);
  }

  return { activeCount, gesamtwert, baseCashflowSum, openRiskSum };
}
