/**
 * Dokumente tab integration tests (jest-expo + RNTL). Rendered through the full
 * Deal-Detail screen so the DD card, lists and buttons run against the live
 * store document slice.
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
import { PHOTO_MS } from '../src/components/detail/DocsTab';
import { colors } from '../src/theme/tokens';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderDocsTab() {
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <DealDetailScreen />
      </DealsProvider>
    </SafeAreaProvider>,
  );
  fireEvent.press(screen.getByTestId('tab-docs'));
}

describe('DocsTab — DD-Fortschritt derived from list state', () => {
  it('shows 7 / 11 and the derived note', () => {
    renderDocsTab();
    expect(within(screen.getByTestId('dd-card')).getByText('7 / 11')).toBeTruthy();
    expect(screen.getByTestId('dd-note')).toHaveTextContent('4 offen · 2 mit Risiko-Fund');
  });
});

describe('DocsTab — Mit Befund rows + badge variants', () => {
  it('renders the two findings with Risiko / Hinweis badges', () => {
    renderDocsTab();
    expect(screen.getByText('ETV-Protokoll 2025')).toBeTruthy();
    expect(within(screen.getByTestId('doc-badge-etv-2025')).getByText('Risiko')).toBeTruthy();
    expect(
      within(screen.getByTestId('doc-badge-wirtschaftsplan-2025')).getByText('Hinweis'),
    ).toBeTruthy();
  });
});

describe('DocsTab — unauffällig section collapsed by default', () => {
  it('hides the unremarkable docs until the toggle is pressed', () => {
    renderDocsTab();
    // Grundbuchauszug is an unauffällig doc — hidden while collapsed.
    expect(screen.queryByTestId('doc-row-grundbuch')).toBeNull();
    expect(screen.getByText('5 unauffällige einblenden ▾')).toBeTruthy();

    fireEvent.press(screen.getByTestId('docs-toggle-unauffaellig'));
    expect(screen.getByTestId('doc-row-grundbuch')).toBeTruthy();
    expect(screen.getByText('Einklappen ▴')).toBeTruthy();
  });
});

describe('DocsTab — Anfordern removes the row, toasts, updates DD', () => {
  it('requesting Beschluss-Sammlung drops it + advances the checklist', () => {
    renderDocsTab();
    expect(screen.getByTestId('missing-row-beschluss')).toBeTruthy();

    fireEvent.press(screen.getByTestId('anfordern-beschluss'));

    expect(screen.queryByTestId('missing-row-beschluss')).toBeNull();
    expect(screen.getByText('KI-Mail an Verwalter erstellt · Beschluss-Sammlung')).toBeTruthy();
    // Checklist shrank: 7 / 10, one fewer "offen".
    expect(within(screen.getByTestId('dd-card')).getByText('7 / 10')).toBeTruthy();
    expect(screen.getByTestId('dd-note')).toHaveTextContent('3 offen · 2 mit Risiko-Fund');
  });
});

describe('DocsTab — Fotos hochladen adds a Foto-Befund after processing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('adds a finding + updates the DD card after the simulated delay', () => {
    renderDocsTab();
    expect(screen.queryByTestId('doc-row-foto-mangel')).toBeNull();

    fireEvent.press(screen.getByTestId('btn-upload-photos'));
    // Nothing added yet — still processing.
    expect(screen.queryByTestId('doc-row-foto-mangel')).toBeNull();

    act(() => jest.advanceTimersByTime(PHOTO_MS));

    expect(screen.getByTestId('doc-row-foto-mangel')).toBeTruthy();
    // Befund grew: 8 / 12 with 3 findings.
    expect(within(screen.getByTestId('dd-card')).getByText('8 / 12')).toBeTruthy();
    expect(screen.getByTestId('dd-note')).toHaveTextContent('4 offen · 3 mit Risiko-Fund');
  });
});

describe('DocsTab — Doku-Viewer', () => {
  it('renders summary + Fundstelle for a befund document', () => {
    renderDocsTab();
    fireEvent.press(screen.getByTestId('doc-row-etv-2025'));

    expect(screen.getByTestId('doc-viewer')).toBeTruthy();
    expect(screen.getByText('KI-ZUSAMMENFASSUNG')).toBeTruthy();
    expect(screen.getByTestId('doc-viewer-fundstelle')).toBeTruthy();
    expect(within(screen.getByTestId('doc-viewer-badge')).getByText('Risiko')).toBeTruthy();
  });

  it('omits the Fundstelle for an unremarkable document', () => {
    renderDocsTab();
    fireEvent.press(screen.getByTestId('docs-toggle-unauffaellig'));
    fireEvent.press(screen.getByTestId('doc-row-expose'));

    expect(screen.getByTestId('doc-viewer')).toBeTruthy();
    expect(screen.queryByTestId('doc-viewer-fundstelle')).toBeNull();
  });
});

describe('DocsTab — ampel dot colour', () => {
  it('the ETV finding row carries a red dot', () => {
    renderDocsTab();
    const row = screen.getByTestId('doc-row-etv-2025');
    const dot = within(row)
      .UNSAFE_getAllByType(require('react-native').View)
      .find((v: { props: { style?: unknown } }) => {
        const style = Array.isArray(v.props.style) ? v.props.style : [v.props.style];
        return style.some((s: { backgroundColor?: string } | undefined) => s?.backgroundColor === colors.red);
      });
    expect(dot).toBeTruthy();
  });
});
