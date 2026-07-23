/**
 * Core deal calculation.
 *
 * Formulas are a 1:1 port of `calc()` in DealPilot.dc.html, matching the
 * README section "Rechenlogik (KERN)". All amounts are EUR floats; rounding
 * is a display concern (see format.ts). Percentages are stored as
 * human-readable numbers (3.8 → 3.8 %) except `maklerPct` (decimal fraction).
 */

import type { DealState, Scenario } from "./types.js";
import { coveredRiskCost } from "./risks.js";

/** Scenario factor applied to the base rent. */
export const SCENARIO_FACTOR: Record<Scenario, number> = {
  base: 1.0,
  bull: 1.08,
  bear: 0.92,
};

/** Default Grunderwerbsteuer rate (Sachsen 5,5 %). Bundesland-dependent. */
export const DEFAULT_GRUNDERWERB_RATE = 0.055;

/** Notar & Grundbuch rate (1,6 %). */
export const NOTAR_RATE = 0.016;

export interface CalcOptions {
  /** Grunderwerbsteuer rate as a decimal fraction. Defaults to 0.055 (Sachsen). */
  grunderwerbRate?: number;
}

/** All derived metrics for a deal state. Everything is a pure function of state. */
export interface CalcResult {
  /** Scenario-adjusted Kaltmiete (EUR/month). */
  rent: number;
  /** Grunderwerbsteuer (EUR). */
  grunderwerb: number;
  /** Notar & Grundbuch (EUR). */
  notar: number;
  /** Makler commission (EUR). */
  makler: number;
  /** Total Kaufnebenkosten (EUR). */
  NK: number;
  /** Sum of appliedCost across covered risks (EUR). */
  riskCost: number;
  /** Active-scenario purchase price (EUR). */
  preis: number;
  /** Gesamtinvestitionskosten = preis + NK + riskCost (EUR). */
  GIK: number;
  /** Eigenkapital, capped at GIK (EUR). */
  ek: number;
  /** Loan = max(0, GIK - ek) (EUR). */
  loan: number;
  /** Monthly interest portion (EUR/month). */
  zinsMonat: number;
  /** Monthly repayment portion (EUR/month). */
  tilgMonat: number;
  /** Annuity = zinsMonat + tilgMonat (EUR/month). */
  bankrate: number;
  /** Non-apportionable monthly costs (EUR/month). */
  nkMonat: number;
  /** Cashflow before tax (EUR/month). */
  cashflow: number;
  /** Monthly appreciation (EUR/month). */
  wertzuwachsM: number;
  /** Annual depreciation on the building (EUR/year). */
  afaJahr: number;
  /** Annual taxable base (EUR/year); negative = loss. */
  steuerbasisJ: number;
  /** Annual tax (EUR/year); negative = saving. */
  steuerJahr: number;
  /** Monthly tax effect (EUR/month); positive = benefit. */
  steuerMonat: number;
  /** Cashflow after tax (EUR/month). */
  cashflowNSt: number;
  /** Monthly wealth accrual (EUR/month). */
  vermoegenszuwachs: number;
  /** Gross rental yield (%). */
  brutto: number;
  /** Net rental yield (%). */
  netto: number;
  /** Price factor = preis / annual rent. */
  faktor: number;
  /** Return on equity over ~10y assumption (%). */
  ekRendite: number;
}

/**
 * Compute all derived metrics for the given deal state.
 *
 * @param state Full deal state.
 * @param options Optional overrides (e.g. Bundesland-specific Grunderwerb rate).
 */
export function calc(state: DealState, options: CalcOptions = {}): CalcResult {
  const grunderwerbRate = options.grunderwerbRate ?? DEFAULT_GRUNDERWERB_RATE;

  const { scenario, priceByCase, financing, costs, deal } = state;
  const preis = priceByCase[scenario];
  const rentBase = deal.rent;

  const nkMonat = costs.hausgeld + costs.ruecklage + costs.verwaltung;

  const grunderwerb = preis * grunderwerbRate;
  const notar = preis * NOTAR_RATE;
  const makler = preis * financing.maklerPct;
  const NK = grunderwerb + notar + makler;

  const rent = rentBase * SCENARIO_FACTOR[scenario];

  // Only covered risks contribute their appliedCost (missing/NaN → 0).
  const riskCost = coveredRiskCost(state.risks);

  const GIK = preis + NK + riskCost;
  const ek = Math.min(financing.ek, GIK);
  const loan = Math.max(0, GIK - ek);

  const zinsMonat = (loan * (financing.zins / 100)) / 12;
  const tilgMonat = (loan * (financing.tilg / 100)) / 12;
  const bankrate = zinsMonat + tilgMonat;

  const cashflow = rent - bankrate - nkMonat;

  const wertzuwachsM = (preis * (state.wertZuwachs / 100)) / 12;

  const afaJahr = state.gebaeudewert * (state.afaSatz / 100);
  const steuerbasisJ = rent * 12 - nkMonat * 12 - zinsMonat * 12 - afaJahr;
  const steuerJahr = steuerbasisJ * (state.steuersatz / 100);
  const steuerMonat = -steuerJahr / 12;
  const cashflowNSt = cashflow + steuerMonat;

  const vermoegenszuwachs = cashflow + tilgMonat + wertzuwachsM + steuerMonat;

  // Guard the yield divisions: a zero denominator (e.g. rent=0 for an
  // unlet unit, or a zero price) would otherwise yield Infinity/NaN.
  const brutto = preis > 0 ? ((rent * 12) / preis) * 100 : 0;
  const netto = GIK > 0 ? ((rent * 12 - nkMonat * 12) / GIK) * 100 : 0;
  const faktor = rent > 0 ? preis / (rent * 12) : 0;

  const ekRendite =
    ek > 0 ? ((cashflow * 12 + tilgMonat * 12 + preis * 0.02) / ek) * 100 : 0;

  return {
    rent,
    grunderwerb,
    notar,
    makler,
    NK,
    riskCost,
    preis,
    GIK,
    ek,
    loan,
    zinsMonat,
    tilgMonat,
    bankrate,
    nkMonat,
    cashflow,
    wertzuwachsM,
    afaJahr,
    steuerbasisJ,
    steuerJahr,
    steuerMonat,
    cashflowNSt,
    vermoegenszuwachs,
    brutto,
    netto,
    faktor,
    ekRendite,
  };
}
