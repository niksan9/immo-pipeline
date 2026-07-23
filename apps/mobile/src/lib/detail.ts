/**
 * Pure view-model builders for the Deal-Detail screen.
 *
 * Every number here is produced by @dealpilot/core (`calc`, `computeScore`,
 * `buildRentSchedule`) and formatted with core's `format*` helpers — nothing
 * derived is hard-coded. These functions are framework-free so they can be
 * unit-tested against a direct core calc of the same inputs.
 */

import {
  buildRentSchedule,
  computeScore,
  coveredRiskCost,
  formatEUR,
  formatNumber,
  formatPercent,
  formatSignedEUR,
  isResolved,
  scoreColor,
  SCHEDULE_YEARS,
  type CalcResult,
  type DealState,
  type Risk,
  type RiskStatus,
  type Scenario,
} from '@dealpilot/core';
import { colors } from '../theme/tokens';
import type { ScoreBreakdown } from '../data/deals';

// --- Colours -----------------------------------------------------------------

/** Ampel hex for a 0…100 sub-score (>=70 green, >=50 yellow, else red). */
export function levelColor(v: number): string {
  const c = scoreColor(v);
  return c === 'green' ? colors.green : c === 'yellow' ? colors.yellow : colors.red;
}

/**
 * Doku-confidence colour, using the prototype's own thresholds
 * (>=60 green, >=48 yellow, else red) — deliberately distinct from `levelColor`.
 */
export function dokuColor(v: number): string {
  if (v >= 60) return colors.green;
  if (v >= 48) return colors.yellow;
  return colors.red;
}

/** Cashflow ampel colour (>=0 green, else red). */
export function cashflowColor(cf: number): string {
  return cf >= 0 ? colors.green : colors.red;
}

// --- Scenario ----------------------------------------------------------------

export const SCENARIO_LABEL: Record<Scenario, string> = {
  base: 'Base',
  bull: 'Bull',
  bear: 'Bear',
};

// --- Score-Zerlegung ---------------------------------------------------------

export interface ScoreBar {
  label: string;
  value: number;
  color: string;
}

/**
 * The four Score-Zerlegung bars. Rendite / Lage & Markt / Objekt & WEG come
 * from the deal's static analyst sub-scores; Doku-Risiken is derived live from
 * core's `computeScore().dokuVal`. Each bar's colour is derived from its value.
 */
export function scoreBars(
  risks: readonly Risk[],
  breakdown: ScoreBreakdown,
): ScoreBar[] {
  const { dokuVal } = computeScore(risks);
  return [
    { label: 'Rendite', value: breakdown.rendite, color: levelColor(breakdown.rendite) },
    { label: 'Lage & Markt', value: breakdown.lage, color: levelColor(breakdown.lage) },
    { label: 'Objekt & WEG', value: breakdown.objekt, color: levelColor(breakdown.objekt) },
    { label: 'Doku-Risiken', value: dokuVal, color: dokuColor(dokuVal) },
  ];
}

// --- Risiken (grouped, dense) ------------------------------------------------

export interface RiskRowVM {
  id: string;
  /** Shorthand: KRIT / HINW / ÜBERN / AKZ. / FRAGE. */
  tag: string;
  tagColor: string;
  title: string;
  amount: string;
  amountColor: string;
}

export interface RiskGroups {
  open: RiskRowVM[];
  done: RiskRowVM[];
  openCount: number;
  doneCount: number;
  hasOpen: boolean;
  hasDone: boolean;
  /** Sum of covered appliedCost, as "einkalkuliert −X €". */
  riskCost: number;
  riskCostStr: string;
}

function openRow(r: Risk): RiskRowVM {
  const tag = r.severity === 'r' ? 'KRIT' : 'HINW';
  const tagColor = r.severity === 'r' ? colors.red : colors.yellow;
  const amount =
    r.estimate > 0 ? `~${formatNumber(r.estimate)}` : r.severity === 'r' ? '?' : 'prüfen';
  return { id: r.id, tag, tagColor, title: r.title, amount, amountColor: colors.faint };
}

function doneRow(r: Risk): RiskRowVM {
  switch (r.status) {
    case 'covered':
      return {
        id: r.id,
        tag: 'ÜBERN',
        tagColor: colors.red,
        title: r.title,
        amount: `−${formatNumber(r.appliedCost)} €`,
        amountColor: colors.red,
      };
    case 'accepted':
      return {
        id: r.id,
        tag: 'AKZ.',
        tagColor: colors.greenText,
        title: r.title,
        amount: '0 €',
        amountColor: colors.greenText,
      };
    default: // question
      return {
        id: r.id,
        tag: 'FRAGE',
        tagColor: colors.muted2,
        title: r.title,
        amount: 'offen b. Verk.',
        amountColor: colors.faint,
      };
  }
}

/** Group + style the risk list exactly as the prototype's Übersicht does. */
export function riskGroups(risks: readonly Risk[]): RiskGroups {
  const open = risks.filter((r) => !isResolved(r.status));
  const done = risks.filter((r) => isResolved(r.status));
  // Single source of truth for the covered-risk total (NaN-safe in core).
  const riskCost = coveredRiskCost(risks);
  return {
    open: open.map(openRow),
    done: done.map(doneRow),
    openCount: open.length,
    doneCount: done.length,
    hasOpen: open.length > 0,
    hasDone: done.length > 0,
    riskCost,
    riskCostStr: `−${formatNumber(riskCost)} €`,
  };
}

// --- Risiko-Detail (lifecycle screen) ---------------------------------------

/** Status-badge appearance per lifecycle state (README "3. Risiko-Detail"). */
export interface RiskStatusBadge {
  text: string;
  /** Badge label colour. */
  textColor: string;
  /** Badge background. */
  bgColor: string;
  /** Leading dot colour. */
  dotColor: string;
  /** OFFEN → red pulsing-ring dot. */
  pulsing: boolean;
  /** Resolved states are read-only → show a lock icon. */
  locked: boolean;
}

/**
 * Status badge variant per state, transcribed from the prototype's `statusMeta`
 * map in DealPilot.dc.html (text / textColor / bgColor / dotColor):
 *   open     → OFFEN · SCHWEBEND            (muted text, neutral bg, red dot, pulsing)
 *   covered  → IN KOSTEN ÜBERNOMMEN         (red)
 *   accepted → AKZEPTIERT · KOSTEN ENTFALLEN (green)
 *   question → FRAGE AN VERKÄUFER OFFEN      (muted text, gray dot)
 * Every state except "open" is resolved → read-only (lock icon).
 */
export function riskStatusBadge(status: RiskStatus): RiskStatusBadge {
  switch (status) {
    case 'open':
      return {
        text: 'OFFEN · SCHWEBEND',
        textColor: colors.muted,
        bgColor: colors.chipBgAlt,
        dotColor: colors.red,
        pulsing: true,
        locked: false,
      };
    case 'covered':
      return {
        text: 'IN KOSTEN ÜBERNOMMEN',
        textColor: colors.red,
        bgColor: colors.redSoft,
        dotColor: colors.red,
        pulsing: false,
        locked: true,
      };
    case 'accepted':
      return {
        text: 'AKZEPTIERT · KOSTEN ENTFALLEN',
        textColor: colors.greenText,
        bgColor: colors.greenSoft,
        dotColor: colors.greenText,
        pulsing: false,
        locked: true,
      };
    case 'question':
      return {
        text: 'FRAGE AN VERKÄUFER OFFEN',
        textColor: colors.muted,
        bgColor: colors.chipBgAlt,
        dotColor: colors.muted2,
        pulsing: false,
        locked: true,
      };
  }
}

/** The "Effekt-Zeile" showing whether/how the risk hits the calculation. */
export interface RiskEffectVM {
  /** open = "KI-Schätzung · dein Anteil"; resolved = "Wirkung auf Kalkulation". */
  label: string;
  /** open only: "zählt noch nicht in die Kalkulation". */
  sub?: string;
  /** open ~estimate · covered −applied · accepted 0 € · question "offen". */
  amountStr: string;
  amountColor: string;
  /** open → dashed border (does not count yet); resolved → solid. */
  dashed: boolean;
}

export function riskEffect(risk: Risk): RiskEffectVM {
  switch (risk.status) {
    case 'open':
      return {
        label: 'KI-Schätzung · dein Anteil',
        sub: 'zählt noch nicht in die Kalkulation',
        amountStr: `~${formatNumber(risk.estimate)} €`,
        amountColor: colors.muted2,
        dashed: true,
      };
    case 'covered':
      return {
        label: 'Wirkung auf Kalkulation',
        amountStr: `−${formatNumber(risk.appliedCost)} €`,
        amountColor: colors.red,
        dashed: false,
      };
    case 'accepted':
      return {
        label: 'Wirkung auf Kalkulation',
        amountStr: '0 €',
        amountColor: colors.greenText,
        dashed: false,
      };
    case 'question':
      return {
        label: 'Wirkung auf Kalkulation',
        amountStr: 'offen',
        amountColor: colors.muted2,
        dashed: false,
      };
  }
}

/** Whether the teal "Bausachverständigen dazuholen" affiliate CTA shows. */
export function showSurveyorCTA(risk: Risk): boolean {
  return risk.status === 'open' && risk.big === true;
}

/** "~2.600 €" estimate label used in the wizard's cover option. */
export function estimateStr(risk: Risk): string {
  return `~${formatNumber(risk.estimate)} €`;
}

// --- Cashflow-Hero + Kennzahl grid ------------------------------------------

export interface HeroVM {
  cfStr: string;
  cfColor: string;
  cfAfterTaxStr: string;
  cfAfterTaxColor: string;
  vermoegenStr: string;
  bruttoStr: string;
}

export function heroVM(c: CalcResult): HeroVM {
  return {
    cfStr: formatSignedEUR(c.cashflow),
    cfColor: cashflowColor(c.cashflow),
    cfAfterTaxStr: formatSignedEUR(c.cashflowNSt),
    cfAfterTaxColor: c.cashflowNSt >= 0 ? colors.greenLight : colors.redLight,
    vermoegenStr: formatSignedEUR(c.vermoegenszuwachs),
    bruttoStr: formatPercent(c.brutto),
  };
}

export interface KennzahlVM {
  ekRendStr: string;
  faktorStr: string;
  gikStr: string;
  bankrateStr: string;
}

export function kennzahlVM(c: CalcResult): KennzahlVM {
  return {
    ekRendStr: formatPercent(c.ekRendite),
    faktorStr: c.faktor.toFixed(1).replace('.', ','),
    gikStr: formatEUR(c.GIK),
    bankrateStr: `${formatEUR(c.bankrate)}/Mo`,
  };
}

// --- Annahmen-Kurzliste ------------------------------------------------------

export interface AssumptionsVM {
  kaufpreisStr: string;
  zinsStr: string;
  tilgStr: string;
  ekStr: string;
  riskRowVal: string;
  riskRowColor: string;
}

export function assumptionsVM(state: DealState, c: CalcResult): AssumptionsVM {
  const covered = c.riskCost;
  return {
    kaufpreisStr: formatEUR(c.preis),
    zinsStr: formatPercent(state.financing.zins),
    tilgStr: formatPercent(state.financing.tilg),
    ekStr: formatEUR(state.financing.ek),
    riskRowVal: covered > 0 ? `−${formatNumber(covered)} €` : 'keine',
    riskRowColor: covered > 0 ? colors.red : colors.faint,
  };
}

// --- Kaufnebenkosten ---------------------------------------------------------

export interface KaufnebenkostenLine {
  label: string;
  hint?: string;
  valueStr: string;
  valueColor: string;
  danger?: boolean;
}

export function kaufnebenkosten(
  state: DealState,
  c: CalcResult,
): KaufnebenkostenLine[] {
  const maklerLabel =
    state.financing.maklerPct > 0
      ? formatPercent(state.financing.maklerPct * 100, 2)
      : 'provisionsfrei';
  const lines: KaufnebenkostenLine[] = [
    {
      label: 'Grunderwerbsteuer',
      hint: 'Sachsen 5,5 %',
      valueStr: formatEUR(c.grunderwerb),
      valueColor: colors.ink,
    },
    {
      label: 'Notar & Grundbuch',
      valueStr: formatEUR(c.notar),
      valueColor: colors.ink,
    },
    {
      label: 'Makler',
      hint: maklerLabel,
      valueStr: formatEUR(c.makler),
      valueColor: colors.ink,
    },
  ];
  if (c.riskCost > 0) {
    lines.push({
      label: 'Übernommene Risiken',
      hint: 'aus DD',
      valueStr: `−${formatNumber(c.riskCost)} €`,
      valueColor: colors.red,
      danger: true,
    });
  }
  return lines;
}

// --- Mietentwicklung (bars + per-year rows) ----------------------------------

export interface ScheduleBar {
  /** Height in px (24…64). */
  height: number;
  color: string;
}

const BAR_MIN = 24;
const BAR_RANGE = 40;

/**
 * 10-year rent bars. teal = the year a measure lands, tealLightAlt = years
 * after a measure, gray = years before any measure — matching the prototype.
 */
export function scheduleBars(state: DealState, c: CalcResult): ScheduleBar[] {
  const rows = buildRentSchedule(state, c);
  const mieten = rows.map((r) => r.miete);
  const min = Math.min(...mieten);
  const max = Math.max(...mieten);
  return rows.map((r) => {
    const norm = max === min ? 0.5 : (r.miete - min) / (max - min);
    const height = Math.round(BAR_MIN + norm * BAR_RANGE);
    let cumUp = 0;
    for (const m of state.measures) if (m.year <= r.year) cumUp += m.uplift;
    const color = r.hasMeasure
      ? colors.teal
      : cumUp > 0
        ? colors.tealLightAlt
        : '#cfd8d3';
    return { height, color };
  });
}

export interface ScheduleRowVM {
  year: number;
  adjusted: boolean;
  rentStr: string;
  cfStr: string;
  cfColor: string;
  measure?: {
    title: string;
    upliftStr: string;
    investStr: string;
  };
}

/** Per-year list; when not expanded only years 1–4 are shown. */
export function scheduleRows(
  state: DealState,
  c: CalcResult,
  expanded: boolean,
): ScheduleRowVM[] {
  const rows = buildRentSchedule(state, c);
  const visible = expanded ? rows : rows.slice(0, 4);
  return visible.map((r) => ({
    year: r.year,
    adjusted: r.adjusted,
    rentStr: formatEUR(r.miete),
    cfStr: `${formatSignedEUR(r.cashflow)}/Mo`,
    cfColor: cashflowColor(r.cashflow),
    ...(r.measure
      ? {
          measure: {
            title: r.measure.title ?? 'Maßnahme',
            upliftStr: `+${formatNumber(r.measure.uplift)} €/Mo`,
            investStr: `−${formatEUR(r.measure.invest)}`,
          },
        }
      : {}),
  }));
}

export const SCHEDULE_YEAR_COUNT = SCHEDULE_YEARS;

// --- Price / discount (Annahmen-Sheet) --------------------------------------

/** Minimum price the discount slider allows: 80 % of the offer, to nearest 1000. */
export function priceMin(offer: number): number {
  return Math.round((offer * 0.8) / 1000) * 1000;
}

/** Discount amount and percentage of a scenario price vs. the offer. */
export function discount(
  offer: number,
  price: number,
): { amount: number; pct: number; str: string } {
  const amount = Math.max(0, offer - price);
  const pct = offer > 0 ? (amount / offer) * 100 : 0;
  const str =
    amount > 0
      ? `−${formatNumber(amount)} € (−${formatPercent(pct)})`
      : 'kein Rabatt';
  return { amount, pct, str };
}
