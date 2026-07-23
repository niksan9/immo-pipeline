/**
 * Integration test: tapping a pipeline row navigates to the deal-detail route
 * via a mocked expo-router.
 */

import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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

describe('PipelineScreen navigation', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders the section headers with counters', () => {
    renderScreen();
    expect(screen.getByText('In Prüfung')).toBeTruthy();
    expect(screen.getByText('Neu')).toBeTruthy();
    expect(screen.getByText('Verhandlung')).toBeTruthy();
    expect(screen.getByText('Verworfen')).toBeTruthy();
  });

  it('navigates to /deal/[id] when a row is tapped', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('deal-row-lindenstrasse-14'));
    expect(mockPush).toHaveBeenCalledWith('/deal/lindenstrasse-14');
  });
});
