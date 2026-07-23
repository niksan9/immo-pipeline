/**
 * Pure pipeline-logic tests: search filtering, status grouping + counters,
 * score/colour derivation via core, discarded rendering data, and that
 * price/yield strings are exactly what core's format helpers produce.
 */

import {
  calc,
  computeScore,
  formatEUR,
  formatPercent,
  scoreColor,
  type Risk,
} from '@dealpilot/core';
import { SEED_DEALS } from '../src/data/deals';
import {
  ampelStyle,
  buildSections,
  deriveRow,
  deriveRows,
  filterRows,
  initials,
  riskLabel,
  SECTION_ORDER,
} from '../src/lib/pipeline';
import { colors } from '../src/theme/tokens';

const rows = deriveRows(SEED_DEALS);
const byId = (id: string) => rows.find((r) => r.id === id)!;
const seedById = (id: string) => SEED_DEALS.find((s) => s.id === id)!;

describe('deriveRow — numbers are computed via @dealpilot/core', () => {
  it('reproduces the design scores and Ampel colours', () => {
    expect(byId('lindenstrasse-14').score).toBe(78);
    expect(byId('lindenstrasse-14').color).toBe('green');

    expect(byId('gartenweg-3').score).toBe(61);
    expect(byId('gartenweg-3').color).toBe('yellow');

    expect(byId('kaiserallee-22').score).toBe(45);
    expect(byId('kaiserallee-22').color).toBe('red');

    expect(byId('suedplatz-7').score).toBe(84);
    expect(byId('suedplatz-7').color).toBe('green');
  });

  it('derives score + colour from core (not hard-coded)', () => {
    for (const seed of SEED_DEALS) {
      if (seed.state.deal.dealStatus === 'verworfen') continue;
      const row = deriveRow(seed);
      const expected = computeScore(seed.state.risks);
      expect(row.score).toBe(expected.scoreVal);
      expect(row.color).toBe(scoreColor(expected.scoreVal));
    }
  });

  it('price string matches core formatEUR', () => {
    expect(byId('lindenstrasse-14').priceStr).toBe('189.000 €');
    expect(byId('lindenstrasse-14').priceStr).toBe(formatEUR(189000));
    expect(byId('gartenweg-3').priceStr).toBe(formatEUR(420000));
    expect(byId('kaiserallee-22').priceStr).toBe('245.000 €');
    expect(byId('suedplatz-7').priceStr).toBe('312.000 €');
  });

  it('yield string matches core gross yield via formatPercent', () => {
    for (const seed of SEED_DEALS) {
      const row = deriveRow(seed);
      const expected = formatPercent(calc(seed.state).brutto);
      expect(row.yieldStr).toBe(expected);
    }
    // …and lands on the exact design values.
    expect(byId('lindenstrasse-14').yieldStr).toBe('4,2 %');
    expect(byId('gartenweg-3').yieldStr).toBe('5,1 %');
    expect(byId('kaiserallee-22').yieldStr).toBe('3,1 %');
    expect(byId('suedplatz-7').yieldStr).toBe('4,6 %');
  });

  it('counts only OPEN risks for the "N Risiken" KPI', () => {
    expect(byId('lindenstrasse-14').openRiskCount).toBe(2);
    expect(byId('lindenstrasse-14').riskLabelStr).toBe('2 Risiken');
    expect(byId('gartenweg-3').openRiskCount).toBe(3);
    expect(byId('kaiserallee-22').openRiskCount).toBe(1);
    expect(byId('kaiserallee-22').riskLabelStr).toBe('1 Risiko');
    expect(byId('suedplatz-7').openRiskCount).toBe(0);
    expect(byId('suedplatz-7').hasRisk).toBe(false);
  });

  it('builds title/subtitle from master data', () => {
    const l = byId('lindenstrasse-14');
    expect(l.title).toBe('ETW · Lindenstraße 14');
    expect(l.subtitle).toBe('Leipzig · 68 m² · 1998 · vermietet');
    expect(byId('kaiserallee-22').subtitle).toBe('Leipzig · 54 m² · 2012 · frei');
    // MFH partial-occupancy override.
    expect(byId('gartenweg-3').subtitle).toBe('Halle · 240 m² · 1965 · teilverm.');
  });

  it('derives shared collaborator initials (owner excluded)', () => {
    expect(byId('lindenstrasse-14').sharedInitials).toEqual(['LW']);
    expect(byId('gartenweg-3').sharedInitials).toEqual([]);
  });
});

describe('deriveRow — discarded (verworfen) rows', () => {
  const r = byId('ringstrasse-40');

  it('has no score (dash) and uses the discard note as subtitle', () => {
    expect(r.discarded).toBe(true);
    expect(r.score).toBeNull();
    expect(r.scoreStr).toBe('—');
    expect(r.color).toBeNull();
    expect(r.style).toBeNull();
    expect(r.subtitle).toBe('Erbpacht + Sonderumlage');
  });
});

describe('ampelStyle — colour mapping via core thresholds', () => {
  it('maps AmpelColor to the correct tints', () => {
    expect(ampelStyle('green')).toEqual({
      rail: colors.green,
      softBg: colors.greenSoft,
      accent: colors.green,
    });
    expect(ampelStyle('yellow').softBg).toBe(colors.yellowSoft);
    expect(ampelStyle('red').rail).toBe(colors.red);
  });

  it('honours core scoreColor thresholds (>=70 green, >=50 yellow, else red)', () => {
    const withResolved = (n: number, coveredCost = 0): Risk[] => {
      const list: Risk[] = [];
      for (let i = 0; i < n; i++) {
        list.push({
          id: `a${i}`,
          title: '',
          description: '',
          severity: 'a',
          estimate: 0,
          status: 'accepted',
          appliedCost: 0,
        });
      }
      if (coveredCost > 0) {
        list.push({
          id: 'cov',
          title: '',
          description: '',
          severity: 'r',
          estimate: coveredCost,
          status: 'covered',
          appliedCost: coveredCost,
        });
      }
      return list;
    };
    // 74 baseline → green boundary at resolvedN 0 (74 >= 70).
    expect(scoreColor(computeScore(withResolved(0)).scoreVal)).toBe('green');
    // Push below 70 → yellow (e.g. one covered risk of 9000 → 74+2-6 = 70 -> still green; 12000 → 74+2-8=68 yellow).
    expect(scoreColor(computeScore(withResolved(0, 12000)).scoreVal)).toBe('yellow');
    // Deep covered cost → red.
    expect(scoreColor(computeScore(withResolved(0, 45000)).scoreVal)).toBe('red');
  });
});

describe('filterRows — free-text search (case-insensitive)', () => {
  it('filters by Ort', () => {
    const leipzig = filterRows(rows, 'leipzig').map((r) => r.id);
    expect(leipzig).toEqual(
      expect.arrayContaining(['lindenstrasse-14', 'kaiserallee-22', 'suedplatz-7']),
    );
    expect(leipzig).not.toContain('gartenweg-3'); // Halle
    expect(leipzig).not.toContain('ringstrasse-40'); // Dresden
    expect(filterRows(rows, 'halle').map((r) => r.id)).toEqual(['gartenweg-3']);
  });

  it('filters by Straße', () => {
    expect(filterRows(rows, 'gartenweg').map((r) => r.id)).toEqual(['gartenweg-3']);
    expect(filterRows(rows, 'Kaiserallee').map((r) => r.id)).toEqual(['kaiserallee-22']);
  });

  it('filters by Typ', () => {
    expect(filterRows(rows, 'mfh').map((r) => r.id)).toEqual(['gartenweg-3']);
    // ETW matches the four ETW deals.
    const etw = filterRows(rows, 'etw').map((r) => r.id);
    expect(etw).toEqual(
      expect.arrayContaining([
        'lindenstrasse-14',
        'kaiserallee-22',
        'suedplatz-7',
        'ringstrasse-40',
      ]),
    );
    expect(etw).not.toContain('gartenweg-3');
  });

  it('is case-insensitive and trims', () => {
    expect(filterRows(rows, 'LEIPZIG').length).toBe(3);
    expect(filterRows(rows, '  MFH  ').map((r) => r.id)).toEqual(['gartenweg-3']);
  });

  it('returns everything for an empty query', () => {
    expect(filterRows(rows, '').length).toBe(rows.length);
    expect(filterRows(rows, '   ').length).toBe(rows.length);
  });
});

describe('buildSections — grouping, counters, fixed order', () => {
  it('groups into the fixed section order with correct counters', () => {
    const sections = buildSections(rows, '');
    expect(sections.map((s) => s.key)).toEqual(SECTION_ORDER);
    expect(sections.map((s) => [s.label, s.count])).toEqual([
      ['In Prüfung', 2],
      ['Neu', 1],
      ['Verhandlung', 1],
      ['Verworfen', 1],
    ]);
    expect(sections[0]!.rows.map((r) => r.id)).toEqual([
      'lindenstrasse-14',
      'gartenweg-3',
    ]);
  });

  it('hides Verworfen and empty sections while searching', () => {
    const leipzig = buildSections(rows, 'leipzig');
    expect(leipzig.map((s) => s.key)).toEqual(['pruefung', 'neu', 'verhandlung']);
    expect(leipzig.map((s) => s.count)).toEqual([1, 1, 1]);

    const gartenweg = buildSections(rows, 'gartenweg');
    expect(gartenweg.map((s) => s.key)).toEqual(['pruefung']);
    expect(gartenweg[0]!.count).toBe(1);
  });
});

describe('small helpers', () => {
  it('initials', () => {
    expect(initials('Lena Weber')).toBe('LW');
    expect(initials('Niklas (du)')).toBe('N(');
    expect(initials('Cher')).toBe('C');
  });

  it('riskLabel pluralises', () => {
    expect(riskLabel(1)).toBe('1 Risiko');
    expect(riskLabel(0)).toBe('0 Risiken');
    expect(riskLabel(3)).toBe('3 Risiken');
  });
});
