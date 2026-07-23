/**
 * Deal-Detail integration tests (jest-expo + RNTL). Cover: tab switching,
 * header score-field colour, scenario → cashflow, live Annahmen (zins) recompute
 * vs. a direct core calc, measure add → schedule, risk grouping/styling, and
 * Kaufnebenkosten equalling core outputs.
 */

import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  calc,
  formatEUR,
  formatSignedEUR,
  type DealState,
} from '@dealpilot/core';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: 'lindenstrasse-14' }),
  Stack: { Screen: () => null },
}));

import DealDetailScreen from '../app/deal/[id]/index';
import { DealsProvider } from '../src/data/store';
import { SEED_DEALS } from '../src/data/deals';
import { colors } from '../src/theme/tokens';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const seedState: DealState = SEED_DEALS.find((s) => s.id === 'lindenstrasse-14')!.state;

function renderDetail() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <DealDetailScreen />
      </DealsProvider>
    </SafeAreaProvider>,
  );
}

describe('DealDetailScreen — header', () => {
  it('renders title, meta, price and a green-tinted score field for score 78', () => {
    renderDetail();
    expect(screen.getByText('Lindenstraße 14')).toBeTruthy();
    expect(screen.getByText('ETW · Leipzig · 68 m²')).toBeTruthy();
    expect(screen.getByText('189.000 €')).toBeTruthy();

    const field = screen.getByTestId('detail-score-field');
    expect(field).toHaveStyle({ backgroundColor: colors.greenSoft });
    expect(within(field).getByText('78')).toBeTruthy();
  });
});

describe('DealDetailScreen — tab switching', () => {
  it('shows Übersicht content by default, then Kalkulation, then a Dokumente stub', () => {
    renderDetail();
    // Overview is default.
    expect(screen.getByText('KI-URTEIL')).toBeTruthy();
    expect(screen.queryByTestId('hero-cashflow')).toBeNull();

    fireEvent.press(screen.getByTestId('tab-calc'));
    expect(screen.getByTestId('hero-cashflow')).toBeTruthy();
    expect(screen.queryByText('KI-URTEIL')).toBeNull();

    fireEvent.press(screen.getByTestId('tab-docs'));
    expect(screen.getByTestId('docs-stub')).toBeTruthy();
  });
});

describe('DealDetailScreen — scenario switch changes cashflow', () => {
  it('recomputes the hero cashflow for Bull per core', () => {
    renderDetail();
    fireEvent.press(screen.getByTestId('tab-calc'));

    expect(screen.getByTestId('hero-cashflow')).toHaveTextContent(
      formatSignedEUR(calc(seedState).cashflow),
    );

    fireEvent.press(screen.getByTestId('scenario-bull'));
    const bull = calc({ ...seedState, scenario: 'bull' });
    expect(screen.getByTestId('hero-cashflow')).toHaveTextContent(
      formatSignedEUR(bull.cashflow),
    );
  });
});

describe('DealDetailScreen — Annahmen change recomputes live', () => {
  it('changing the Sollzins slider updates hero + bankrate consistently with core', () => {
    renderDetail();
    fireEvent.press(screen.getByTestId('tab-calc'));
    fireEvent.press(screen.getByText('Annahmen anpassen'));

    // Drive the slider directly (see Slider.tsx testability note).
    fireEvent(screen.getByTestId('slider-zins'), 'valueChange', 4.5);

    const expected = calc({
      ...seedState,
      financing: { ...seedState.financing, zins: 4.5 },
    });
    expect(screen.getByTestId('hero-cashflow')).toHaveTextContent(
      formatSignedEUR(expected.cashflow),
    );
    expect(
      within(screen.getByTestId('kz-bankrate')).getByText(
        `${formatEUR(expected.bankrate)}/Mo`,
      ),
    ).toBeTruthy();
  });
});

describe('DealDetailScreen — measure add updates the schedule', () => {
  it('adds a measure at year 2 → teal bar + measure row', () => {
    renderDetail();
    fireEvent.press(screen.getByTestId('tab-calc'));
    fireEvent.press(screen.getByTestId('add-measure-btn'));

    fireEvent.changeText(screen.getByTestId('measure-title'), 'Neue Küche');
    fireEvent.changeText(screen.getByTestId('measure-invest'), '8000');
    fireEvent.changeText(screen.getByTestId('measure-uplift'), '120');
    fireEvent.press(screen.getByTestId('measure-submit'));

    // Year 2 (bar index 1) is now the measure year → teal.
    expect(screen.getByTestId('schedule-bar-1')).toHaveStyle({
      backgroundColor: colors.teal,
    });
    expect(screen.getByText(/Neue Küche/)).toBeTruthy();
  });
});

describe('DealDetailScreen — risk section grouping + amount styling', () => {
  it('groups OFFEN/ERLEDIGT with status-styled amounts', () => {
    renderDetail();
    expect(screen.getByText('OFFEN · SCHWEBEND · 2')).toBeTruthy();
    expect(screen.getByText('ERLEDIGT · 2')).toBeTruthy();
    // Open critical shorthand appears twice.
    expect(screen.getAllByText('KRIT')).toHaveLength(2);
    // Open estimate is a gray "~amount".
    expect(screen.getByText('~2.600')).toBeTruthy();
    // Accepted risks read "0 €".
    expect(screen.getAllByText('0 €').length).toBeGreaterThan(0);
  });
});

describe('DealDetailScreen — Kaufnebenkosten equals core', () => {
  it('renders grunderwerb / notar / makler exactly as core computes them', () => {
    renderDetail();
    fireEvent.press(screen.getByTestId('tab-calc'));
    const c = calc(seedState);
    expect(screen.getByText(formatEUR(c.grunderwerb))).toBeTruthy();
    expect(screen.getByText(formatEUR(c.notar))).toBeTruthy();
    expect(screen.getByText(formatEUR(c.makler))).toBeTruthy();
  });
});

describe('DealDetailScreen — Annahmen-Sheet open state', () => {
  it('is closed until "Annahmen anpassen" is pressed', () => {
    renderDetail();
    fireEvent.press(screen.getByTestId('tab-calc'));
    expect(screen.queryByTestId('annahmen-sheet')).toBeNull();
    fireEvent.press(screen.getByText('Annahmen anpassen'));
    expect(screen.getByTestId('annahmen-sheet')).toBeTruthy();
  });
});
