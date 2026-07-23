/**
 * Component tests for the deal row: score rendering, discarded (dash + dimmed),
 * risk label, shared avatars, press callback, and a snapshot.
 */

import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DealRow } from '../src/components/DealRow';
import { deriveRow } from '../src/lib/pipeline';
import { SEED_DEALS } from '../src/data/deals';

const seed = (id: string) => SEED_DEALS.find((s) => s.id === id)!;
const row = (id: string) => deriveRow(seed(id));

describe('DealRow', () => {
  it('renders the computed score, SCORE label, price, yield and risk KPI', () => {
    render(<DealRow row={row('lindenstrasse-14')} />);
    expect(screen.getByText('78')).toBeTruthy();
    expect(screen.getByText('SCORE')).toBeTruthy();
    expect(screen.getByText('ETW · Lindenstraße 14')).toBeTruthy();
    expect(screen.getByText('Leipzig · 68 m² · 1998 · vermietet')).toBeTruthy();
    expect(screen.getByText('189.000 €')).toBeTruthy();
    expect(screen.getByText('· 4,2 %')).toBeTruthy();
    expect(screen.getByText('2 Risiken')).toBeTruthy();
  });

  it('renders shared collaborator avatars', () => {
    render(<DealRow row={row('lindenstrasse-14')} />);
    expect(screen.getByText('LW')).toBeTruthy();
  });

  it('omits the risk KPI when there are no open risks', () => {
    render(<DealRow row={row('suedplatz-7')} />);
    expect(screen.getByText('84')).toBeTruthy();
    expect(screen.queryByText(/Risik/)).toBeNull();
  });

  it('renders discarded rows dimmed with a dash instead of a score', () => {
    render(<DealRow row={row('ringstrasse-40')} />);
    expect(screen.getByText('—')).toBeTruthy();
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
