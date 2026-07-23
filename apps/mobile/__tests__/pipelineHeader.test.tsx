/**
 * Pipeline "4b" header + navigation tests:
 *  - greeting shows "Guten Morgen" + the session first name,
 *  - the portfolio card renders Gesamtwert / N DEALS / Base-Case cashflow /
 *    open risks aggregated over the active deals,
 *  - the avatar navigates to the profile screen,
 *  - the floating action button opens the create-deal overlay,
 *  - the old bottom tab bar (Markt / nav +) is gone.
 */

import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { formatEUR } from '@dealpilot/core';

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

describe('PipelineScreen — 4b header', () => {
  beforeEach(() => mockPush.mockClear());

  it('greets with the session first name', () => {
    renderScreen();
    expect(screen.getByText('Guten Morgen')).toBeTruthy();
    expect(screen.getByTestId('pipeline-greeting')).toHaveTextContent('Niklas');
  });

  it('renders the aggregated portfolio KPIs (active deals only)', () => {
    renderScreen();
    // 189k + 420k + 245k + 312k = 1.166.000 € (ringstrasse/verworfen excluded).
    expect(screen.getByTestId('portfolio-gesamtwert')).toHaveTextContent(
      formatEUR(1_166_000),
    );
    expect(screen.getByTestId('portfolio-count')).toHaveTextContent('4 DEALS');
    expect(screen.getByTestId('portfolio-risks')).toHaveTextContent('6');
    // Subline copy matches the aggregated number (no "in Prüfung").
    expect(
      screen.getByText('Summe der Kaufpreise deiner aktiven Deals'),
    ).toBeTruthy();
  });

  it('opens the profile screen from the avatar (initials from the name)', () => {
    renderScreen();
    expect(screen.getByTestId('pipeline-avatar')).toHaveTextContent('NB');
    fireEvent.press(screen.getByTestId('pipeline-avatar'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('opens the create-deal overlay from the floating action button', () => {
    renderScreen();
    expect(screen.queryByTestId('create-overlay')).toBeNull();
    fireEvent.press(screen.getByTestId('pipeline-fab'));
    expect(screen.getByTestId('create-overlay')).toBeTruthy();
  });

  it('no longer renders the bottom tab bar', () => {
    renderScreen();
    expect(screen.queryByText('Markt')).toBeNull();
    expect(screen.queryByTestId('nav-new-deal')).toBeNull();
    expect(screen.queryByTestId('nav-profile')).toBeNull();
  });
});
