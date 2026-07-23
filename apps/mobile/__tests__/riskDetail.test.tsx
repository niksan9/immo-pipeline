/**
 * Risiko-Detail integration tests (jest-expo + RNTL).
 *
 * Drive the real screen through the store and assert that:
 *  - every wizard path fires the correct core transition (covered = estimate,
 *    accepted = 0, question = 0), reopen works, and resolved risks expose NO
 *    "bewerten" CTA (invalid transitions are unreachable via the UI);
 *  - the context keyword rules produce a proposal (relieving) or none (neutral),
 *    and applying a proposal goes through core's applyContextProposal;
 *  - the live-effect chain: after covering a risk the store's derived score,
 *    GIK and max price equal a direct @dealpilot/core computation with the new
 *    risk state;
 *  - the status badge variant and the source-backed Fundstelle render.
 */

import * as React from 'react';
import { Text } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  calc,
  computeScore,
  formatEUR,
  transitionRisk,
  type DealState,
} from '@dealpilot/core';

const mockBack = jest.fn();
let mockParams: { id: string; riskId: string } = {
  id: 'lindenstrasse-14',
  riskId: 'dach',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

import RiskDetailScreen from '../app/deal/[id]/risk/[riskId]';
import { DealsProvider, useDeals } from '../src/data/store';
import { SEED_DEALS } from '../src/data/deals';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const seedState: DealState = SEED_DEALS.find((s) => s.id === 'lindenstrasse-14')!.state;

/** Reads the live derived metrics for the deal straight from the store. */
function Probe({ id }: { id: string }) {
  const { getState } = useDeals();
  const s = getState(id)!;
  const score = computeScore(s.risks);
  const c = calc(s);
  const risk = s.risks.find((r) => r.id === mockParams.riskId);
  return (
    <>
      <Text testID="probe-status">{risk ? risk.status : 'none'}</Text>
      <Text testID="probe-applied">{String(risk ? risk.appliedCost : -1)}</Text>
      <Text testID="probe-score">{String(score.scoreVal)}</Text>
      <Text testID="probe-gik">{formatEUR(c.GIK)}</Text>
      <Text testID="probe-maxpreis">{formatEUR(score.maxPreis)}</Text>
    </>
  );
}

function renderRisk(id: string, riskId: string) {
  mockParams = { id, riskId };
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <RiskDetailScreen />
        <Probe id={id} />
      </DealsProvider>
    </SafeAreaProvider>,
  );
}

/** Expected derived metrics if `riskId` on the deal were transitioned to `to`. */
function expected(id: string, riskId: string, to: 'covered' | 'accepted' | 'question') {
  const base = SEED_DEALS.find((s) => s.id === id)!.state;
  const risks = base.risks.map((r) => (r.id === riskId ? transitionRisk(r, to) : r));
  const next: DealState = { ...base, risks };
  return {
    score: computeScore(risks).scoreVal,
    gik: formatEUR(calc(next).GIK),
    maxPreis: formatEUR(computeScore(risks).maxPreis),
  };
}

beforeEach(() => mockBack.mockClear());

describe('RiskDetail — status badge + Fundstelle (open risk)', () => {
  it('shows the OFFEN badge, a pulsing dot and the source-backed quote', () => {
    renderRisk('lindenstrasse-14', 'dach');
    expect(within(screen.getByTestId('risk-badge')).getByText('OFFEN · SCHWEBEND')).toBeTruthy();
    expect(screen.getByTestId('pulse-dot')).toBeTruthy();

    const fund = screen.getByTestId('risk-fundstelle');
    expect(within(fund).getByText(/TOP 7 – Antrag Dachsanierung/)).toBeTruthy();
    expect(within(fund).getByText('ETV-Protokoll 2025 · Seite 3 · TOP 7')).toBeTruthy();

    // Open effect line is the dashed KI estimate.
    expect(within(screen.getByTestId('risk-effect')).getByText('~2.600 €')).toBeTruthy();
    // Open risk exposes the evaluate CTA.
    expect(screen.getByTestId('risk-evaluate-cta')).toBeTruthy();
  });

  it('offers the surveyor affiliate card for a big open risk (toast, no transition)', () => {
    renderRisk('lindenstrasse-14', 'dach');
    fireEvent.press(screen.getByTestId('risk-surveyor-cta'));
    expect(screen.getByText('Bausachverständigen angefragt · Kontakt folgt')).toBeTruthy();
    // Still open — the affiliate stub does not resolve the risk.
    expect(screen.getByTestId('probe-status')).toHaveTextContent('open');
  });
});

describe('RiskDetail — wizard: In Kosten übernehmen (cover)', () => {
  it('covers via core (appliedCost = estimate) and re-derives score/GIK/maxPreis live', () => {
    renderRisk('lindenstrasse-14', 'dach');
    fireEvent.press(screen.getByTestId('risk-evaluate-cta'));
    fireEvent.press(screen.getByTestId('wiz-cover'));

    expect(screen.getByTestId('probe-status')).toHaveTextContent('covered');
    expect(screen.getByTestId('probe-applied')).toHaveTextContent('2600');

    const exp = expected('lindenstrasse-14', 'dach', 'covered');
    expect(screen.getByTestId('probe-score')).toHaveTextContent(String(exp.score));
    expect(screen.getByTestId('probe-gik')).toHaveTextContent(exp.gik);
    expect(screen.getByTestId('probe-maxpreis')).toHaveTextContent(exp.maxPreis);

    // Resolved → no more evaluate CTA (invalid transitions unreachable), and
    // the update/reopen actions appear instead.
    expect(screen.queryByTestId('risk-evaluate-cta')).toBeNull();
    expect(screen.getByTestId('risk-update-btn')).toBeTruthy();
    expect(screen.getByTestId('risk-reopen-btn')).toBeTruthy();
    // Toast confirmation.
    expect(screen.getByText('In Kosten übernommen · −2.600 €')).toBeTruthy();
  });
});

describe('RiskDetail — wizard: Akzeptieren + Fragen an Verkäufer', () => {
  it('accept sets appliedCost 0 and locks the risk', () => {
    renderRisk('lindenstrasse-14', 'dach');
    fireEvent.press(screen.getByTestId('risk-evaluate-cta'));
    fireEvent.press(screen.getByTestId('wiz-accept'));
    expect(screen.getByTestId('probe-status')).toHaveTextContent('accepted');
    expect(screen.getByTestId('probe-applied')).toHaveTextContent('0');
    expect(screen.getByText('Akzeptiert · Kosten entfallen')).toBeTruthy();
  });

  it('question sets appliedCost 0 (does not feed GIK)', () => {
    renderRisk('lindenstrasse-14', 'dach');
    fireEvent.press(screen.getByTestId('risk-evaluate-cta'));
    fireEvent.press(screen.getByTestId('wiz-question'));
    expect(screen.getByTestId('probe-status')).toHaveTextContent('question');
    expect(screen.getByTestId('probe-applied')).toHaveTextContent('0');
    // GIK is unchanged from the seed (question contributes nothing).
    expect(screen.getByTestId('probe-gik')).toHaveTextContent(formatEUR(calc(seedState).GIK));
  });
});

describe('RiskDetail — resolved risk exposes no wizard CTA (reopen only)', () => {
  it('an accepted risk has no "bewerten" CTA and can be reopened via core', () => {
    renderRisk('lindenstrasse-14', 'teilung');
    // Resolved from the start → no evaluate CTA.
    expect(screen.queryByTestId('risk-evaluate-cta')).toBeNull();
    expect(within(screen.getByTestId('risk-badge')).getByText('AKZEPTIERT · KOSTEN ENTFALLEN')).toBeTruthy();
    // Its captured context renders.
    expect(screen.getByTestId('risk-context-card')).toBeTruthy();

    fireEvent.press(screen.getByTestId('risk-reopen-btn'));
    expect(screen.getByTestId('probe-status')).toHaveTextContent('open');
    expect(screen.getByText('Risiko neu eröffnet')).toBeTruthy();
    // Reopened → the evaluate CTA is back.
    expect(screen.getByTestId('risk-evaluate-cta')).toBeTruthy();
  });
});

describe('RiskDetail — context dialog keyword rules', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('relieving input → "Kosten entfallen" proposal → applies as accepted via core', () => {
    renderRisk('lindenstrasse-14', 'dach');
    fireEvent.press(screen.getByTestId('risk-evaluate-cta'));
    fireEvent.press(screen.getByTestId('wiz-context'));

    fireEvent.changeText(screen.getByTestId('ctx-input'), 'Gutachten sagt Dach ist trocken');
    fireEvent.press(screen.getByTestId('ctx-send'));
    act(() => jest.advanceTimersByTime(900));

    const proposal = screen.getByTestId('ctx-proposal');
    expect(within(proposal).getByText('Vorschlag: Kosten entfallen')).toBeTruthy();

    fireEvent.press(screen.getByTestId('ctx-apply'));
    expect(screen.getByTestId('probe-status')).toHaveTextContent('accepted');
    expect(screen.getByTestId('probe-applied')).toHaveTextContent('0');
    expect(screen.getByText('Kontext übernommen · Kosten entfallen')).toBeTruthy();
  });

  it('neutral first message → clarifying reply, NO proposal', () => {
    renderRisk('lindenstrasse-14', 'dach');
    fireEvent.press(screen.getByTestId('risk-evaluate-cta'));
    fireEvent.press(screen.getByTestId('wiz-context'));

    fireEvent.changeText(screen.getByTestId('ctx-input'), 'weiß ich nicht so genau');
    fireEvent.press(screen.getByTestId('ctx-send'));
    act(() => jest.advanceTimersByTime(900));

    expect(screen.queryByTestId('ctx-proposal')).toBeNull();
    // Still open — nothing was applied.
    expect(screen.getByTestId('probe-status')).toHaveTextContent('open');
  });
});
