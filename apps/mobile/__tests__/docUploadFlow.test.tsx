/**
 * Dokumenten-Upload-Flow integration tests (jest-expo + RNTL). The step-2 → 3
 * auto-advance is driven with jest fake timers so the flow stays deterministic.
 */

import * as React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'lindenstrasse-14' }),
  Stack: { Screen: () => null },
}));

import DealDetailScreen from '../app/deal/[id]/index';
import { DealsProvider } from '../src/data/store';
import { ANALYZE_MS } from '../src/components/detail/DocUploadFlow';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function openFlow() {
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <DealDetailScreen />
      </DealsProvider>
    </SafeAreaProvider>,
  );
  fireEvent.press(screen.getByTestId('tab-docs'));
  fireEvent.press(screen.getByTestId('btn-upload-doc'));
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

describe('DocUploadFlow — step sequence with auto-advance', () => {
  it('add → analyzing → (auto) question → result', () => {
    openFlow();
    expect(screen.getByTestId('doc-flow-add')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-analyze'));
    expect(screen.getByTestId('doc-flow-analyzing')).toBeTruthy();
    // No progress percent on the analyzing step (spec forbids it).
    expect(screen.queryByText(/%/)).toBeNull();

    act(() => jest.advanceTimersByTime(ANALYZE_MS));
    expect(screen.getByTestId('doc-flow-question')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-answer-S2'));
    expect(screen.getByTestId('doc-flow-result')).toBeTruthy();
  });
});

describe('DocUploadFlow — step 3 is skippable', () => {
  it('Überspringen jumps straight to the result', () => {
    openFlow();
    fireEvent.press(screen.getByTestId('doc-flow-analyze'));
    act(() => jest.advanceTimersByTime(ANALYZE_MS));

    fireEvent.press(screen.getByTestId('doc-flow-skip'));
    expect(screen.getByTestId('doc-flow-result')).toBeTruthy();
  });
});

describe('DocUploadFlow — simulated file picker', () => {
  it('drop-area tap adds a file, × removes one', () => {
    openFlow();
    expect(screen.getByText('HINZUGEFÜGT · 3')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-drop'));
    expect(screen.getByText('HINZUGEFÜGT · 4')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-remove-f-expose'));
    expect(screen.getByText('HINZUGEFÜGT · 3')).toBeTruthy();
  });
});

describe('DocUploadFlow — category override', () => {
  it('overriding a split doc changes its chip label', () => {
    openFlow();
    fireEvent.press(screen.getByTestId('doc-flow-analyze'));
    act(() => jest.advanceTimersByTime(ANALYZE_MS));
    fireEvent.press(screen.getByTestId('doc-flow-skip'));

    const row = screen.getByTestId('doc-flow-split-etv-2024');
    expect(within(row).getByText('Protokoll ▾')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-cat-etv-2024'));
    fireEvent.press(screen.getByTestId('doc-flow-pick-Sonstiges'));

    expect(within(screen.getByTestId('doc-flow-split-etv-2024')).getByText('Sonstiges ▾')).toBeTruthy();
  });
});

describe('DocUploadFlow — re-analyze loops back to step 2', () => {
  it('"neu analysieren" returns to the analyzing step', () => {
    openFlow();
    fireEvent.press(screen.getByTestId('doc-flow-analyze'));
    act(() => jest.advanceTimersByTime(ANALYZE_MS));
    fireEvent.press(screen.getByTestId('doc-flow-skip'));
    expect(screen.getByTestId('doc-flow-result')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-reanalyze'));
    expect(screen.getByTestId('doc-flow-analyzing')).toBeTruthy();

    // And it still auto-advances the second time around.
    act(() => jest.advanceTimersByTime(ANALYZE_MS));
    expect(screen.getByTestId('doc-flow-question')).toBeTruthy();
  });
});

describe('DocUploadFlow — Übernehmen adds documents + updates the DD card', () => {
  it('merges the 3 new documents (ETV 24/23 + photo) and closes', () => {
    openFlow();
    // Baseline before the flow.
    expect(within(screen.getByTestId('dd-card')).getByText('7 / 11')).toBeTruthy();

    fireEvent.press(screen.getByTestId('doc-flow-analyze'));
    act(() => jest.advanceTimersByTime(ANALYZE_MS));
    fireEvent.press(screen.getByTestId('doc-flow-skip'));
    fireEvent.press(screen.getByTestId('doc-flow-apply'));

    // Overlay closed.
    expect(screen.queryByTestId('doc-flow')).toBeNull();
    expect(screen.getByText('Dokumente eingeordnet')).toBeTruthy();
    // present 7 → 10, total 11 → 14; befund count 2 → 3.
    expect(within(screen.getByTestId('dd-card')).getByText('10 / 14')).toBeTruthy();
    expect(screen.getByTestId('dd-note')).toHaveTextContent('4 offen · 3 mit Risiko-Fund');
  });
});
