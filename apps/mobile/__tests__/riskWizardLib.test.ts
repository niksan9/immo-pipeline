/**
 * Pure unit tests for the scripted context-dialog logic (lib/riskWizard.ts).
 * These cover the keyword rules extracted from the prototype's `sendCtx`:
 * relieving input → proposal with the expected amount; neutral input → a
 * clarifying question with no proposal (first turn) or a halved-cost proposal
 * (second turn).
 */

import {
  isRelieving,
  proposalEffect,
  RELIEVING_PATTERN,
  respondToContext,
} from '../src/lib/riskWizard';
import { formatNumber } from '@dealpilot/core';

describe('isRelieving — keyword rules', () => {
  const relieving = [
    'Der Verkäufer übernimmt die Kosten',
    'Das Dach ist laut Gutachten trocken',
    'Der Gutachter bestätigt es',
    'Wurde bereits saniert',
    'Der Schaden ist behoben',
    'Es ist nichts kaputt',
    'kein Mangel festgestellt',
    'kein Schaden vorhanden',
    'nachweislich in Ordnung',
    'Das hat der Verkäufer schon erledigt',
  ];
  const neutral = [
    'Ich habe noch keine Unterlagen dazu',
    'Der Nachbar meinte irgendwas',
    'Weiß ich nicht genau',
    // Tightened: a bare seller mention / a vague "niedriger" is NOT evidence —
    // these previously matched `verkäufer` / `niedriger` and wrongly waived cost.
    'Ich frage noch beim Verkäufer nach',
    'Ich frage den Verkäufer',
    'Kosten könnten niedriger sein',
    'Der Betrag ist niedriger als geschätzt',
  ];

  it('matches every relieving phrase (case-insensitive)', () => {
    for (const t of relieving) expect(isRelieving(t)).toBe(true);
  });

  it('does not match neutral phrases (incl. bare seller / "niedriger")', () => {
    for (const t of neutral) expect(isRelieving(t)).toBe(false);
  });

  it('exposes the tightened evidence-only pattern', () => {
    expect(RELIEVING_PATTERN.source).toBe(
      'übernimmt|übernommen|gutachten|gutachter|trocken|saniert|behoben|nichts kaputt|kein mangel|kein schaden|erledigt|nachweislich',
    );
  });
});

describe('respondToContext — proposal generation', () => {
  it('first neutral message asks for proof and makes NO proposal', () => {
    const res = respondToContext({ text: 'weiß nicht', userTurns: 1, estimate: 2600 });
    expect(res.proposal).toBeNull();
    expect(res.reply).toMatch(/schriftlich/i);
  });

  it('relieving message proposes "Kosten entfallen" (accepted, 0 €)', () => {
    const res = respondToContext({
      text: 'Gutachten sagt Dach ist trocken',
      userTurns: 1,
      estimate: 2600,
    });
    expect(res.proposal).toEqual({
      label: 'Kosten entfallen',
      status: 'accepted',
      cost: 0,
      note: 'Gutachten sagt Dach ist trocken',
    });
  });

  it('second neutral message proposes "Kosten reduziert" (covered, estimate/2)', () => {
    const res = respondToContext({ text: 'ist halb so wild', userTurns: 2, estimate: 2600 });
    expect(res.proposal).toEqual({
      label: 'Kosten reduziert',
      status: 'covered',
      cost: 1300,
      note: 'ist halb so wild',
    });
  });

  it('rounds a halved odd estimate', () => {
    const res = respondToContext({ text: 'unklar', userTurns: 2, estimate: 9500 });
    expect(res.proposal?.cost).toBe(4750);
  });

  it('a neutral seller mention does NOT waive cost (falls through)', () => {
    // First turn: clarifying question, no proposal.
    const first = respondToContext({
      text: 'ich frage den Verkäufer',
      userTurns: 1,
      estimate: 2600,
    });
    expect(first.proposal).toBeNull();
    expect(first.reply).toMatch(/schriftlich/i);

    // Second turn, still no evidence: a REDUCTION (covered), never a 0 € waiver.
    const second = respondToContext({
      text: 'ich frage den Verkäufer nochmal',
      userTurns: 2,
      estimate: 2600,
    });
    expect(second.proposal?.status).toBe('covered');
    expect(second.proposal?.cost).toBe(1300);
    expect(second.proposal?.label).not.toBe('Kosten entfallen');
  });

  it('a vague "niedriger" does NOT waive cost', () => {
    const res = respondToContext({
      text: 'die Kosten könnten niedriger sein',
      userTurns: 1,
      estimate: 2600,
    });
    expect(res.proposal).toBeNull();
  });

  it('genuine evidence still waives cost (accepted, 0 €)', () => {
    const res = respondToContext({
      text: 'Der Verkäufer übernimmt das laut Kaufvertrag',
      userTurns: 1,
      estimate: 2600,
    });
    expect(res.proposal).toEqual({
      label: 'Kosten entfallen',
      status: 'accepted',
      cost: 0,
      note: 'Der Verkäufer übernimmt das laut Kaufvertrag',
    });
  });
});

describe('proposalEffect', () => {
  it('renders 0 € for a zero-cost proposal', () => {
    expect(
      proposalEffect({ label: 'Kosten entfallen', status: 'accepted', cost: 0 }, formatNumber),
    ).toBe('0 €');
  });

  it('renders a signed euro amount otherwise', () => {
    expect(
      proposalEffect({ label: 'Kosten reduziert', status: 'covered', cost: 1300 }, formatNumber),
    ).toBe('−1.300 €');
  });
});
