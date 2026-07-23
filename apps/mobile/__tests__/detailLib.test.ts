/**
 * Pure detail view-model tests: every builder is checked against a direct
 * @dealpilot/core computation of the same inputs (no hard-coded expectations).
 */

import {
  buildRentSchedule,
  calc,
  computeScore,
  formatEUR,
  formatPercent,
  formatSignedEUR,
  type DealState,
} from '@dealpilot/core';
import { SEED_DEALS } from '../src/data/deals';
import { colors } from '../src/theme/tokens';
import {
  assumptionsVM,
  cashflowColor,
  discount,
  dokuColor,
  heroVM,
  kaufnebenkosten,
  kennzahlVM,
  levelColor,
  priceMin,
  riskGroups,
  scheduleBars,
  scheduleRows,
  scoreBars,
} from '../src/lib/detail';

const linden = SEED_DEALS.find((s) => s.id === 'lindenstrasse-14')!;
const garten = SEED_DEALS.find((s) => s.id === 'gartenweg-3')!;

describe('colour helpers honour the ampel thresholds', () => {
  it('levelColor: >=70 green, >=50 yellow, else red', () => {
    expect(levelColor(82)).toBe(colors.green);
    expect(levelColor(54)).toBe(colors.yellow);
    expect(levelColor(44)).toBe(colors.red);
  });
  it('dokuColor: >=60 green, >=48 yellow, else red', () => {
    expect(dokuColor(65)).toBe(colors.green);
    expect(dokuColor(49)).toBe(colors.yellow);
    expect(dokuColor(41)).toBe(colors.red);
  });
  it('cashflowColor: >=0 green else red', () => {
    expect(cashflowColor(1)).toBe(colors.green);
    expect(cashflowColor(-1)).toBe(colors.red);
  });
});

describe('scoreBars — Doku bar derived from core dokuVal', () => {
  it('uses the static sub-scores and appends core doku confidence', () => {
    const bars = scoreBars(linden.state.risks, linden.scoreBreakdown);
    expect(bars.map((b) => b.label)).toEqual([
      'Rendite',
      'Lage & Markt',
      'Objekt & WEG',
      'Doku-Risiken',
    ]);
    expect(bars[0]!.value).toBe(linden.scoreBreakdown.rendite);
    const { dokuVal } = computeScore(linden.state.risks);
    expect(bars[3]!.value).toBe(dokuVal);
    expect(bars[3]!.color).toBe(dokuColor(dokuVal));
  });
});

describe('riskGroups — grouping + amount styling by status', () => {
  it('groups Lindenstraße (2 open KRIT, 2 accepted) with correct styling', () => {
    const g = riskGroups(linden.state.risks);
    expect(g.openCount).toBe(2);
    expect(g.doneCount).toBe(2);

    // Open critical risks: KRIT tag, red, gray "~estimate" amount.
    expect(g.open.map((r) => r.tag)).toEqual(['KRIT', 'KRIT']);
    expect(g.open.every((r) => r.tagColor === colors.red)).toBe(true);
    expect(g.open.every((r) => r.amountColor === colors.faint)).toBe(true);
    expect(g.open[0]!.amount).toBe('~2.600');

    // Accepted risks: AKZ. tag, green text, "0 €".
    expect(g.done.every((r) => r.tag === 'AKZ.')).toBe(true);
    expect(g.done.every((r) => r.amount === '0 €')).toBe(true);
    expect(g.done.every((r) => r.amountColor === colors.greenText)).toBe(true);

    // No covered risks → riskCost 0.
    expect(g.riskCost).toBe(0);
    expect(g.riskCostStr).toBe('−0 €');
  });

  it('styles covered risks as ÜBERN / red / −amount and sums riskCost', () => {
    const g = riskGroups(garten.state.risks);
    const covered = g.done.filter((r) => r.tag === 'ÜBERN');
    expect(covered.length).toBe(3); // heizung, elektrik, fassade
    expect(covered.every((r) => r.tagColor === colors.red)).toBe(true);
    const expectedCost = calc(garten.state).riskCost;
    expect(g.riskCost).toBe(expectedCost);
    expect(g.riskCostStr).toBe(`−${Math.round(expectedCost).toLocaleString('de-DE')} €`);
  });
});

describe('hero / kennzahl / assumptions — equal to a direct core calc', () => {
  const state = linden.state;
  const c = calc(state);

  it('heroVM matches core cashflow / after-tax / vermögen / brutto', () => {
    const h = heroVM(c);
    expect(h.cfStr).toBe(formatSignedEUR(c.cashflow));
    expect(h.cfColor).toBe(cashflowColor(c.cashflow));
    expect(h.cfAfterTaxStr).toBe(formatSignedEUR(c.cashflowNSt));
    expect(h.vermoegenStr).toBe(formatSignedEUR(c.vermoegenszuwachs));
    expect(h.bruttoStr).toBe(formatPercent(c.brutto));
  });

  it('kennzahlVM matches core ekRendite / faktor / GIK / bankrate', () => {
    const k = kennzahlVM(c);
    expect(k.ekRendStr).toBe(formatPercent(c.ekRendite));
    expect(k.faktorStr).toBe(c.faktor.toFixed(1).replace('.', ','));
    expect(k.gikStr).toBe(formatEUR(c.GIK));
    expect(k.bankrateStr).toBe(`${formatEUR(c.bankrate)}/Mo`);
  });

  it('assumptionsVM shows "keine" when no covered risks', () => {
    const a = assumptionsVM(state, c);
    expect(a.kaufpreisStr).toBe(formatEUR(c.preis));
    expect(a.zinsStr).toBe(formatPercent(state.financing.zins));
    expect(a.riskRowVal).toBe('keine');
    expect(a.riskRowColor).toBe(colors.faint);
  });
});

describe('kaufnebenkosten — equals core outputs', () => {
  it('grunderwerb / notar / makler match core, no risk line when riskCost 0', () => {
    const c = calc(linden.state);
    const lines = kaufnebenkosten(linden.state, c);
    expect(lines.map((l) => l.label)).toEqual([
      'Grunderwerbsteuer',
      'Notar & Grundbuch',
      'Makler',
    ]);
    expect(lines[0]!.valueStr).toBe(formatEUR(c.grunderwerb));
    expect(lines[1]!.valueStr).toBe(formatEUR(c.notar));
    expect(lines[2]!.valueStr).toBe(formatEUR(c.makler));
  });

  it('appends a red "Übernommene Risiken" line when riskCost > 0', () => {
    const c = calc(garten.state);
    const lines = kaufnebenkosten(garten.state, c);
    const risk = lines.find((l) => l.label === 'Übernommene Risiken');
    expect(risk).toBeDefined();
    expect(risk!.valueColor).toBe(colors.red);
    expect(risk!.valueStr).toBe(`−${Math.round(c.riskCost).toLocaleString('de-DE')} €`);
  });
});

describe('mietfahrplan — bars + rows from core buildRentSchedule', () => {
  it('rows equal core schedule (rent + cashflow) and respect expand', () => {
    const c = calc(garten.state);
    const schedule = buildRentSchedule(garten.state, c);

    const collapsed = scheduleRows(garten.state, c, false);
    expect(collapsed.length).toBe(4);
    const expanded = scheduleRows(garten.state, c, true);
    expect(expanded.length).toBe(10);

    expanded.forEach((row, i) => {
      expect(row.rentStr).toBe(formatEUR(schedule[i]!.miete));
      expect(row.cfStr).toBe(`${formatSignedEUR(schedule[i]!.cashflow)}/Mo`);
    });
  });

  it('bars: measure year teal, later years tealLightAlt, earlier gray', () => {
    const withMeasure: DealState = {
      ...garten.state,
      measures: [{ id: 1, title: 'Bad', year: 3, invest: 6000, uplift: 200 }],
    };
    const bars = scheduleBars(withMeasure, calc(withMeasure));
    expect(bars).toHaveLength(10);
    expect(bars[1]!.color).toBe('#cfd8d3'); // year 2 (before measure) gray
    expect(bars[2]!.color).toBe(colors.teal); // year 3 (measure) teal
    expect(bars[3]!.color).toBe(colors.tealLightAlt); // year 4 (after) light
  });
});

describe('price / discount helpers (Annahmen-Sheet)', () => {
  it('priceMin is 80 % of the offer to the nearest 1000', () => {
    expect(priceMin(189000)).toBe(151000);
  });
  it('discount reports amount, pct and a formatted string', () => {
    const d = discount(189000, 180000);
    expect(d.amount).toBe(9000);
    expect(d.str).toContain('−9.000 €');
    expect(discount(189000, 189000).str).toBe('kein Rabatt');
  });
});
