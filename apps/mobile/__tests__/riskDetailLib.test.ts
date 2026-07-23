/**
 * Pure unit tests for the Risiko-Detail view-models (lib/detail.ts):
 * status-badge variant per lifecycle state, the Effekt-Zeile, and the surveyor
 * CTA gate.
 */

import {
  estimateStr,
  riskEffect,
  riskStatusBadge,
  showSurveyorCTA,
} from '../src/lib/detail';
import { colors } from '../src/theme/tokens';
import type { Risk } from '@dealpilot/core';

function risk(over: Partial<Risk> = {}): Risk {
  return {
    id: 'r',
    title: 'T',
    description: '',
    severity: 'r',
    estimate: 2600,
    status: 'open',
    appliedCost: 0,
    ...over,
  };
}

describe('riskStatusBadge — one variant per state', () => {
  it('open → OFFEN · SCHWEBEND, red pulsing dot, not locked', () => {
    const b = riskStatusBadge('open');
    expect(b.text).toBe('OFFEN · SCHWEBEND');
    expect(b.dotColor).toBe(colors.red);
    expect(b.pulsing).toBe(true);
    expect(b.locked).toBe(false);
  });

  it('covered → IN KOSTEN ÜBERNOMMEN (red), locked', () => {
    const b = riskStatusBadge('covered');
    expect(b.text).toBe('IN KOSTEN ÜBERNOMMEN');
    expect(b.textColor).toBe(colors.red);
    expect(b.bgColor).toBe(colors.redSoft);
    expect(b.locked).toBe(true);
    expect(b.pulsing).toBe(false);
  });

  it('accepted → AKZEPTIERT · KOSTEN ENTFALLEN (green), locked', () => {
    const b = riskStatusBadge('accepted');
    expect(b.text).toBe('AKZEPTIERT · KOSTEN ENTFALLEN');
    expect(b.textColor).toBe(colors.greenText);
    expect(b.bgColor).toBe(colors.greenSoft);
    expect(b.locked).toBe(true);
  });

  it('question → FRAGE AN VERKÄUFER OFFEN (gray), locked', () => {
    const b = riskStatusBadge('question');
    expect(b.text).toBe('FRAGE AN VERKÄUFER OFFEN');
    expect(b.dotColor).toBe(colors.muted2);
    expect(b.locked).toBe(true);
  });
});

describe('riskEffect — Effekt-Zeile per state', () => {
  it('open → dashed KI-Schätzung with ~estimate, muted', () => {
    const e = riskEffect(risk({ status: 'open', estimate: 2600 }));
    expect(e.dashed).toBe(true);
    expect(e.label).toMatch(/KI-Schätzung/);
    expect(e.sub).toMatch(/zählt noch nicht/);
    expect(e.amountStr).toBe('~2.600 €');
    expect(e.amountColor).toBe(colors.muted2);
  });

  it('covered → solid "Wirkung auf Kalkulation" with −applied, red', () => {
    const e = riskEffect(risk({ status: 'covered', appliedCost: 2600 }));
    expect(e.dashed).toBe(false);
    expect(e.label).toBe('Wirkung auf Kalkulation');
    expect(e.amountStr).toBe('−2.600 €');
    expect(e.amountColor).toBe(colors.red);
  });

  it('accepted → 0 €, green', () => {
    const e = riskEffect(risk({ status: 'accepted', appliedCost: 0 }));
    expect(e.amountStr).toBe('0 €');
    expect(e.amountColor).toBe(colors.greenText);
  });

  it('question → "offen"', () => {
    const e = riskEffect(risk({ status: 'question' }));
    expect(e.amountStr).toBe('offen');
  });
});

describe('showSurveyorCTA', () => {
  it('only for open + big risks', () => {
    expect(showSurveyorCTA(risk({ status: 'open', big: true }))).toBe(true);
    expect(showSurveyorCTA(risk({ status: 'open', big: false }))).toBe(false);
    expect(showSurveyorCTA(risk({ status: 'covered', big: true }))).toBe(false);
  });
});

describe('estimateStr', () => {
  it('formats a ~euro estimate', () => {
    expect(estimateStr(risk({ estimate: 2600 }))).toBe('~2.600 €');
  });
});
