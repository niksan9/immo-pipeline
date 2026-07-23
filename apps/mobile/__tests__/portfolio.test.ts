/**
 * Portfolio-selector tests. The header KPIs aggregate over the ACTIVE deals
 * (Neu · In Prüfung · Verhandlung), excluding Verworfen and Gekauft:
 *   - Gesamtwert = Σ Kaufpreis,
 *   - baseCashflowSum = Σ BASE-case monthly cashflow (never Bull/Bear),
 *   - openRiskSum = Σ open risks.
 * Gesamtwert / count / risks are hand-checked against the seeds; the cashflow
 * sum is cross-checked against core so the base-case + active-filter semantics
 * are pinned without hard-coding a euro figure.
 */

import { calc } from '@dealpilot/core';
import { SEED_DEALS, type SeedDeal } from '../src/data/deals';
import {
  ACTIVE_STATUSES,
  computePortfolio,
  isActiveStatus,
} from '../src/lib/portfolio';

/** Deep-ish clone of one seed so per-test overrides never touch the module seed. */
function clone(id: string): SeedDeal {
  const s = SEED_DEALS.find((x) => x.id === id)!;
  return { ...s, state: { ...s.state, deal: { ...s.state.deal } } };
}

describe('isActiveStatus / ACTIVE_STATUSES', () => {
  it('treats only the three working statuses as active', () => {
    expect([...ACTIVE_STATUSES].sort()).toEqual(['neu', 'pruefung', 'verhandlung']);
    expect(isActiveStatus('neu')).toBe(true);
    expect(isActiveStatus('pruefung')).toBe(true);
    expect(isActiveStatus('verhandlung')).toBe(true);
    expect(isActiveStatus('verworfen')).toBe(false);
    expect(isActiveStatus('gekauft')).toBe(false);
  });
});

describe('computePortfolio — hand-checked over the seed deals', () => {
  const p = computePortfolio(SEED_DEALS);

  it('counts the 4 active deals (excludes the verworfen one)', () => {
    // lindenstrasse (pruefung) + gartenweg (pruefung) + kaiserallee (neu) +
    // suedplatz (verhandlung); ringstrasse (verworfen) is excluded.
    expect(p.activeCount).toBe(4);
  });

  it('Gesamtwert = Σ Kaufpreis of active deals', () => {
    // 189.000 + 420.000 + 245.000 + 312.000
    expect(p.gesamtwert).toBe(1_166_000);
  });

  it('openRiskSum = Σ open risks of active deals', () => {
    // 2 + 3 + 1 + 0
    expect(p.openRiskSum).toBe(6);
  });

  it('baseCashflowSum uses each active deal BASE-case cashflow (cross-checked via core)', () => {
    const expected = SEED_DEALS.filter((s) =>
      isActiveStatus(s.state.deal.dealStatus),
    ).reduce((sum, s) => sum + calc({ ...s.state, scenario: 'base' }).cashflow, 0);
    expect(p.baseCashflowSum).toBeCloseTo(expected, 6);
  });
});

describe('computePortfolio — exclusions', () => {
  it('excludes Verworfen deals entirely', () => {
    expect(computePortfolio([clone('ringstrasse-40')])).toEqual({
      activeCount: 0,
      gesamtwert: 0,
      baseCashflowSum: 0,
      openRiskSum: 0,
    });
  });

  it('excludes Gekauft deals entirely', () => {
    const bought = clone('suedplatz-7');
    bought.state.deal.dealStatus = 'gekauft';
    expect(computePortfolio([bought]).activeCount).toBe(0);
    expect(computePortfolio([bought]).gesamtwert).toBe(0);
  });
});

describe('computePortfolio — cashflow always uses the BASE scenario', () => {
  it('ignores the deal active scenario (Bull) and computes the base cashflow', () => {
    const bull = clone('lindenstrasse-14');
    bull.state = { ...bull.state, scenario: 'bull' };
    const base = clone('lindenstrasse-14');

    const baseCf = calc({ ...base.state, scenario: 'base' }).cashflow;
    const bullCf = calc({ ...bull.state, scenario: 'bull' }).cashflow;

    // The two scenarios genuinely differ (rent factor 1.0 vs 1.08)…
    expect(baseCf).not.toBeCloseTo(bullCf, 2);
    // …and the selector reports the BASE figure even though the deal is on Bull.
    expect(computePortfolio([bull]).baseCashflowSum).toBeCloseTo(baseCf, 6);
  });
});
