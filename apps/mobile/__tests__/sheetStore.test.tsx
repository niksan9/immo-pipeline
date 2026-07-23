/**
 * Two focused suites:
 *  - Sheet: open/close (backdrop press → onClose; visible=false → unmounts).
 *  - Store: an edit in the store re-derives the pipeline row (score / yield),
 *    proving the Deal-Detail and Pipeline share one source of truth.
 */

import * as React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { calc, formatPercent } from '@dealpilot/core';

import { Sheet } from '../src/components/Sheet';
import { DealsProvider, useDeals } from '../src/data/store';
import { SEED_DEALS } from '../src/data/deals';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrap(node: React.ReactNode) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>;
}

describe('Sheet — open/close', () => {
  it('renders nothing while closed, appears when opened', () => {
    const { rerender } = render(
      wrap(
        <Sheet visible={false} onClose={jest.fn()} testID="sheet">
          <Text>Inhalt</Text>
        </Sheet>,
      ),
    );
    expect(screen.queryByTestId('sheet')).toBeNull();

    rerender(
      wrap(
        <Sheet visible onClose={jest.fn()} testID="sheet">
          <Text>Inhalt</Text>
        </Sheet>,
      ),
    );
    expect(screen.getByTestId('sheet')).toBeTruthy();
    expect(screen.getByText('Inhalt')).toBeTruthy();
  });

  it('calls onClose when the backdrop is pressed and unmounts on close', async () => {
    const onClose = jest.fn();
    const { rerender } = render(
      wrap(
        <Sheet visible onClose={onClose} testID="sheet">
          <Text>Inhalt</Text>
        </Sheet>,
      ),
    );
    fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Parent reacts by flipping visible → false; the sheet animates out and
    // unmounts.
    await act(async () => {
      rerender(
        wrap(
          <Sheet visible={false} onClose={onClose} testID="sheet">
            <Text>Inhalt</Text>
          </Sheet>,
        ),
      );
    });
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull(), {
      timeout: 3000,
    });
  });
});

/** Probe consumer: shows a deal's derived yield + score and can switch scenario. */
function YieldProbe({ id }: { id: string }) {
  const { getRow, setScenario } = useDeals();
  const row = getRow(id)!;
  return (
    <View>
      <Text testID="yield">{row.yieldStr}</Text>
      <Text testID="score">{String(row.score)}</Text>
      <Text testID="switch" onPress={() => setScenario(id, 'bull')}>
        bull
      </Text>
    </View>
  );
}

describe('store — pipeline row reflects an edit', () => {
  it('switching scenario re-derives the pipeline yield via core', () => {
    const seed = SEED_DEALS.find((s) => s.id === 'lindenstrasse-14')!;
    render(
      <DealsProvider>
        <YieldProbe id="lindenstrasse-14" />
      </DealsProvider>,
    );

    expect(screen.getByTestId('yield')).toHaveTextContent(
      formatPercent(calc(seed.state).brutto),
    );

    fireEvent.press(screen.getByTestId('switch'));

    const bull = calc({ ...seed.state, scenario: 'bull' });
    expect(screen.getByTestId('yield')).toHaveTextContent(formatPercent(bull.brutto));
  });
});
