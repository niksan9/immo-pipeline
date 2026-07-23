/**
 * Deal-Detail ⋮ context-menu actions, driven through the real screen + store:
 *  - Status ändern regroups the pipeline (→ Verworfen) and the header shows "—".
 *  - Objektdaten edit (Kaufpreis + provisionsfrei) re-derives the pipeline row
 *    yield and the detail header price, consistent with a direct core calc.
 *  - Zusammenarbeiten add / remove reflect in the row's collaborator initials.
 *  - Löschen removes the deal from the store and navigates back.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { calc, formatEUR, formatPercent, type DealState } from '@dealpilot/core';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: 'lindenstrasse-14' }),
  Stack: { Screen: () => null },
}));

import DealDetailScreen from '../app/deal/[id]/index';
import { DealsProvider, useDeals } from '../src/data/store';
import { SEED_DEALS } from '../src/data/deals';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ID = 'lindenstrasse-14';
const seedState: DealState = SEED_DEALS.find((s) => s.id === ID)!.state;

/** Surfaces the live pipeline row for the deal under test. */
function RowProbe({ id }: { id: string }) {
  const { getRow } = useDeals();
  const row = getRow(id);
  return (
    <View>
      <Text testID="probe-present">{row ? 'yes' : 'gone'}</Text>
      {row && <Text testID="probe-yield">{row.yieldStr}</Text>}
      {row && <Text testID="probe-status">{row.dealStatus}</Text>}
      {row && <Text testID="probe-shared">{row.sharedInitials.join(',')}</Text>}
    </View>
  );
}

function renderDetail() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <DealDetailScreen />
        <RowProbe id={ID} />
      </DealsProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => mockBack.mockClear());

describe('Status ändern', () => {
  it('regroups the pipeline and shows "—" for Verworfen', () => {
    renderDetail();
    expect(screen.getByTestId('probe-status')).toHaveTextContent('pruefung');

    fireEvent.press(screen.getByLabelText('Aktionsmenü'));
    fireEvent.press(screen.getByTestId('menu-status'));
    // Score option is active initially (deal is in Prüfung → status opt pruefung).
    expect(screen.getByTestId('status-opt-pruefung')).toBeSelected();
    fireEvent.press(screen.getByTestId('status-opt-verworfen'));

    expect(screen.getByTestId('probe-status')).toHaveTextContent('verworfen');
    // Header score field now shows the dash.
    expect(within(screen.getByTestId('detail-score-field')).getByText('—')).toBeTruthy();
  });
});

describe('Objektdaten bearbeiten', () => {
  it('recalcs pipeline row yield + header price after editing Kaufpreis + provisionsfrei', () => {
    renderDetail();

    fireEvent.press(screen.getByLabelText('Aktionsmenü'));
    fireEvent.press(screen.getByTestId('menu-edit'));
    fireEvent.changeText(screen.getByTestId('obj-kaufpreis'), '300000');
    fireEvent.press(screen.getByTestId('obj-provisionsfrei'));
    fireEvent.press(screen.getByTestId('obj-save'));

    const expected: DealState = {
      ...seedState,
      deal: { ...seedState.deal, kaufpreis: 300000 },
      priceByCase: { base: 300000, bull: 300000, bear: 300000 },
      financing: { ...seedState.financing, maklerPct: 0 },
    };

    // Pipeline row yield matches a direct core calc of the edited state.
    expect(screen.getByTestId('probe-yield')).toHaveTextContent(
      formatPercent(calc(expected).brutto),
    );
    // Detail header price reflects the new master price.
    expect(screen.getAllByText(formatEUR(300000)).length).toBeGreaterThan(0);
  });
});

describe('Zusammenarbeiten', () => {
  it('adds and removes collaborators, reflected in the row initials', () => {
    renderDetail();
    // Seeded shared with Lena Weber (LW).
    expect(screen.getByTestId('probe-shared')).toHaveTextContent('LW');

    fireEvent.press(screen.getByLabelText('Aktionsmenü'));
    fireEvent.press(screen.getByTestId('menu-collab'));

    fireEvent.changeText(screen.getByTestId('collab-email'), 'max.mustermann@example.com');
    fireEvent.press(screen.getByTestId('collab-invite'));
    // New collaborator "Max Mustermann" → MM shows up in the row initials.
    expect(screen.getByTestId('probe-shared')).toHaveTextContent('LW,MM');

    // Remove the seeded Lena (collaborator id 2).
    fireEvent.press(screen.getByTestId('collab-remove-2'));
    expect(screen.getByTestId('probe-shared')).toHaveTextContent('MM');
  });
});

describe('Löschen', () => {
  it('confirms, removes the deal and navigates back', () => {
    renderDetail();
    expect(screen.getByTestId('probe-present')).toHaveTextContent('yes');

    fireEvent.press(screen.getByLabelText('Aktionsmenü'));
    fireEvent.press(screen.getByTestId('menu-delete'));
    // Confirm dialog appears; confirm the destructive action.
    expect(screen.getByTestId('delete-confirm')).toBeTruthy();
    fireEvent.press(screen.getByTestId('delete-confirm-confirm'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('probe-present')).toHaveTextContent('gone');
  });
});
