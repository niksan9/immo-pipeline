/**
 * 10-year rent & cashflow schedule ("Mietfahrplan pro Jahr").
 *
 * Ports `buildRows()` + the per-year cashflow (`_cfY`) from DealPilot.dc.html
 * and the README "Mietfahrplan pro Jahr" section.
 *
 * Ambiguity resolved from the prototype:
 *  - README writes `miete_y = rentBase * g^(y-1) + …`. In the prototype the
 *    schedule is fed `c.rent` (the SCENARIO-ADJUSTED rent), not raw deal.rent.
 *    We follow the prototype: the caller passes the scenario-adjusted rent.
 *  - `risikoMonat` is not defined in the README. The prototype computes it as
 *    `Math.round(riskCost / 120)` — the covered-risk total amortised over
 *    120 months (10 years). We replicate that exactly (rounding included, to
 *    stay faithful to the prototype's displayed numbers).
 */

import type { CalcResult } from "./calc.js";
import type { DealState, Measure } from "./types.js";

/** Number of years in the schedule. */
export const SCHEDULE_YEARS = 10;

export interface ScheduleRow {
  /** 1-based year. */
  year: number;
  /** Kaltmiete in this year (EUR/month). */
  miete: number;
  /** Cashflow in this year (EUR/month). */
  cashflow: number;
  /** True if a measure lands exactly in this year (rent pill shows ANGEPASST). */
  adjusted: boolean;
  /** Same as `adjusted`; kept for parity with the prototype's `hasMeasure`. */
  hasMeasure: boolean;
  /** The measure landing in this year, if any. */
  measure?: Measure;
}

/** Monthly risk amortisation used in the per-year cashflow. */
export function risikoMonat(riskCost: number): number {
  return Math.round(riskCost / 120);
}

export interface ScheduleOptions {
  /**
   * Scenario-adjusted starting rent (EUR/month). Defaults to `calc.rent`,
   * matching the prototype which passes `c.rent` into buildRows.
   */
  rentBase?: number;
}

/**
 * Build the 10-year rent/cashflow schedule.
 *
 * @param state Full deal state (for steig, costGrowth, measures).
 * @param calc  Result of calc(state) — supplies bankrate, nkMonat, riskCost, rent.
 */
export function buildRentSchedule(
  state: DealState,
  calc: CalcResult,
  options: ScheduleOptions = {},
): ScheduleRow[] {
  const rentBase = options.rentBase ?? calc.rent;
  const g = 1 + state.steig / 100;
  const cg = 1 + state.costGrowth / 100;
  const rm = risikoMonat(calc.riskCost);

  const rows: ScheduleRow[] = [];
  for (let year = 1; year <= SCHEDULE_YEARS; year++) {
    let uplift = 0;
    let measure: Measure | undefined;
    for (const m of state.measures) {
      if (m.year <= year) uplift += m.uplift;
      if (m.year === year) measure = m;
    }

    const miete = rentBase * Math.pow(g, year - 1) + uplift;
    const cashflow =
      miete - calc.bankrate - calc.nkMonat * Math.pow(cg, year - 1) - rm;

    rows.push({
      year,
      miete,
      cashflow,
      adjusted: measure !== undefined,
      hasMeasure: measure !== undefined,
      ...(measure !== undefined ? { measure } : {}),
    });
  }
  return rows;
}
