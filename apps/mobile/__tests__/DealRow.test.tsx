/**
 * Component tests for the "4b" deal row: the 44×44 score tile (colored number,
 * no SCORE micro-label, no Ort/m²/Baujahr subline), the single mono
 * `Preis · Rendite · Risiko` line, discarded (grey tile + "—" + dimmed), shared
 * avatars, press callback, and a snapshot.
 */

import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DealRow } from '../src/components/DealRow';
import { deriveRow } from '../src/lib/pipeline';
import { SEED_DEALS } from '../src/data/deals';

const seed = (id: string) => SEED_DEALS.find((s) => s.id === id)!;
const row = (id: string) => deriveRow(seed(id));

describe('DealRow', () => {
  it('renders the score tile and the single Preis · Rendite · Risiko line', () => {
    render(<DealRow row={row('lindenstrasse-14')} />);
    // Score tile shows the number only (no "SCORE" micro-label in the 4b tile).
    expect(screen.getByText('78')).toBeTruthy();
    expect(screen.queryByText('SCORE')).toBeNull();
    // Title = Typ · Straße.
    expect(screen.getByText('ETW · Lindenstraße 14')).toBeTruthy();
    // Ort/m²/Baujahr subline is gone from the row (lives in the detail now).
    expect(screen.queryByText('Leipzig · 68 m² · 1998 · vermietet')).toBeNull();
    // One mono line combining price · yield · risk.
    expect(screen.getByText('189.000 € · 4,2 % · 2 Risiken')).toBeTruthy();
  });

  it('renders shared collaborator avatars', () => {
    render(<DealRow row={row('lindenstrasse-14')} />);
    expect(screen.getByText('LW')).toBeTruthy();
  });

  it('omits the risk part of the KPI line when there are no open risks', () => {
    render(<DealRow row={row('suedplatz-7')} />);
    expect(screen.getByText('84')).toBeTruthy();
    expect(screen.queryByText(/Risik/)).toBeNull();
    expect(screen.getByText('312.000 € · 4,6 %')).toBeTruthy();
  });

  it('renders discarded rows dimmed with a grey tile "—" (no score)', () => {
    render(<DealRow row={row('ringstrasse-40')} />);
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('ETW · Ringstraße 40')).toBeTruthy();
    expect(screen.getByText('Erbpacht + Sonderumlage')).toBeTruthy();
    expect(screen.queryByText('SCORE')).toBeNull();
    const el = screen.getByTestId('deal-row-ringstrasse-40');
    expect(el).toHaveStyle({ opacity: 0.62 });
  });

  it('calls onPress with the deal id when tapped', () => {
    const onPress = jest.fn();
    render(<DealRow row={row('kaiserallee-22')} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('deal-row-kaiserallee-22'));
    expect(onPress).toHaveBeenCalledWith('kaiserallee-22');
  });

  it('matches snapshot', () => {
    const tree = render(<DealRow row={row('gartenweg-3')} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
