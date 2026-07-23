/**
 * "Deal anlegen" tests: overlay validation (button disabled until the required
 * fields — mandatory vermietet-status + Kaufpreis + Wohnfläche — are valid) and
 * that store.createDeal produces a deal in the "Neu" section with core-derived
 * score / yield, opening its detail.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { calc, computeScore, formatPercent } from '@dealpilot/core';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

import PipelineScreen from '../app/index';
import { CreateDealOverlay } from '../src/components/CreateDealOverlay';
import { DealsProvider, useDeals } from '../src/data/store';
import { createDealState, type CreateDealInput } from '../src/data/deals';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrap(node: React.ReactNode) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>;
}

const INPUT: CreateDealInput = {
  objektart: 'ETW',
  address: 'Musterstraße 1',
  plz: '04103',
  ort: 'Leipzig',
  vermietet: 'vermietet',
  kaufpreis: 200000,
  qm: 70,
  rent: 700,
};

describe('CreateDealOverlay — validation', () => {
  it('keeps "Deal anlegen" disabled until status + Kaufpreis + Wohnfläche are set', () => {
    const onSubmit = jest.fn();
    render(
      wrap(
        <CreateDealOverlay
          visible
          onClose={jest.fn()}
          onSubmit={onSubmit}
          onToast={jest.fn()}
        />,
      ),
    );

    const submit = screen.getByTestId('create-submit');
    expect(submit).toBeDisabled();

    // Price + area but no vermietet status → still disabled (status mandatory).
    fireEvent.changeText(screen.getByTestId('create-preis'), '200000');
    fireEvent.changeText(screen.getByTestId('create-qm'), '70');
    expect(submit).toBeDisabled();
    fireEvent.press(submit);
    expect(onSubmit).not.toHaveBeenCalled();

    // Choose the mandatory status → now valid.
    fireEvent.press(screen.getByTestId('create-verm-vermietet'));
    expect(submit).toBeEnabled();

    fireEvent.press(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      objektart: 'ETW',
      vermietet: 'vermietet',
      kaufpreis: 200000,
      qm: 70,
    });
  });

  it('is disabled with a status but no numbers', () => {
    const onSubmit = jest.fn();
    render(
      wrap(
        <CreateDealOverlay visible onClose={jest.fn()} onSubmit={onSubmit} onToast={jest.fn()} />,
      ),
    );
    fireEvent.press(screen.getByTestId('create-verm-nicht_vermietet'));
    expect(screen.getByTestId('create-submit')).toBeDisabled();
    fireEvent.press(screen.getByTestId('create-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

/** Probe: creates a deal on demand and surfaces its derived row + section. */
function CreateProbe() {
  const { createDeal, getRow, sections } = useDeals();
  const [id, setId] = React.useState<string | null>(null);
  const row = id ? getRow(id) : undefined;
  const neu = sections.find((s) => s.key === 'neu');
  return (
    <View>
      <Text testID="go" onPress={() => setId(createDeal(INPUT))}>
        create
      </Text>
      {row && <Text testID="row-yield">{row.yieldStr}</Text>}
      {row && <Text testID="row-score">{String(row.score)}</Text>}
      {row && <Text testID="row-status">{row.dealStatus}</Text>}
      {row && (
        <Text testID="row-in-neu">
          {neu?.rows.some((r) => r.id === id) ? 'yes' : 'no'}
        </Text>
      )}
    </View>
  );
}

describe('store.createDeal', () => {
  it('adds a deal to "Neu" with core-derived score + yield', () => {
    render(
      <DealsProvider>
        <CreateProbe />
      </DealsProvider>,
    );

    fireEvent.press(screen.getByTestId('go'));

    const state = createDealState(INPUT);
    expect(screen.getByTestId('row-status')).toHaveTextContent('neu');
    expect(screen.getByTestId('row-in-neu')).toHaveTextContent('yes');
    expect(screen.getByTestId('row-yield')).toHaveTextContent(
      formatPercent(calc(state).brutto),
    );
    // No risks → prototype heuristic base score of 74.
    expect(screen.getByTestId('row-score')).toHaveTextContent(
      String(computeScore(state.risks).scoreVal),
    );
    expect(screen.getByTestId('row-score')).toHaveTextContent('74');
  });
});

describe('PipelineScreen — create flow navigates to the new deal', () => {
  beforeEach(() => mockPush.mockClear());

  it('opens the overlay from the bottom-nav +, creates and pushes the route', () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <DealsProvider>
          <PipelineScreen />
        </DealsProvider>
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('nav-new-deal'));
    expect(screen.getByTestId('create-overlay')).toBeTruthy();

    fireEvent.press(screen.getByTestId('create-verm-vermietet'));
    fireEvent.changeText(screen.getByTestId('create-preis'), '200000');
    fireEvent.changeText(screen.getByTestId('create-qm'), '70');
    fireEvent.changeText(screen.getByTestId('create-street'), 'Musterstraße 1');
    fireEvent.press(screen.getByTestId('create-submit'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toMatch(/^\/deal\/musterstrasse-1-/);
  });
});
