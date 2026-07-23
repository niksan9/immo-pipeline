/**
 * Pipeline ⋮ action menu (integration): opening the menu, the active sort
 * checkmark, and that picking a sort actually reorders the rendered rows while
 * the fixed status sections stay put.
 */

import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('../src/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { id: 'u1', name: 'Niklas Berg', firstName: 'Niklas' } },
    isPending: false,
  }),
  firstNameOf: jest.requireActual('../src/lib/name').firstNameOf,
}));

import PipelineScreen from '../app/index';
import { DealsProvider } from '../src/data/store';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <PipelineScreen />
      </DealsProvider>
    </SafeAreaProvider>,
  );
}

/** Deal-row testIDs in on-screen (tree) order. */
function rowOrder(): string[] {
  return screen.getAllByTestId(/^deal-row-/).map((el) => String(el.props.testID));
}

describe('PipelineActionMenu', () => {
  it('opens from the ⋮ and shows Score as the active sort', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('pipeline-kebab'));
    expect(screen.getByTestId('pipe-menu')).toBeTruthy();
    expect(screen.getByTestId('pipe-menu-sort-score')).toBeSelected();
    expect(screen.getByTestId('pipe-menu-sort-kaufpreis')).not.toBeSelected();
  });

  it('reorders rows within a section when sorting by Kaufpreis', () => {
    // Fake timers so the sheet's close-out animation completes before we reopen
    // it (otherwise the pending setRendered(false) would race the reopen).
    jest.useFakeTimers();
    try {
      renderScreen();
      // Default (score): Lindenstraße (78) before Gartenweg (61) in "In Prüfung".
      const before = rowOrder();
      expect(before.indexOf('deal-row-lindenstrasse-14')).toBeLessThan(
        before.indexOf('deal-row-gartenweg-3'),
      );

      fireEvent.press(screen.getByTestId('pipeline-kebab'));
      fireEvent.press(screen.getByTestId('pipe-menu-sort-kaufpreis'));
      act(() => jest.runOnlyPendingTimers()); // finish the close-out animation

      // By price: Gartenweg (420k) now precedes Lindenstraße (189k).
      const after = rowOrder();
      expect(after.indexOf('deal-row-gartenweg-3')).toBeLessThan(
        after.indexOf('deal-row-lindenstrasse-14'),
      );
      // Sections still fixed: both In-Prüfung deals precede the "Neu" deal.
      expect(after.indexOf('deal-row-lindenstrasse-14')).toBeLessThan(
        after.indexOf('deal-row-kaiserallee-22'),
      );

      // Re-opening the menu shows Kaufpreis as the active sort now.
      fireEvent.press(screen.getByTestId('pipeline-kebab'));
      act(() => jest.runOnlyPendingTimers());
      expect(screen.getByTestId('pipe-menu-sort-kaufpreis')).toBeSelected();
    } finally {
      jest.useRealTimers();
    }
  });
});
