/**
 * Deal-Detail screen: fixed header (score / title / meta / price + tab bar) over
 * four tabs — Übersicht, Kalkulation (both fully live via @dealpilot/core),
 * Dokumente and Chat (visual stubs). All calc state lives in the store, so edits
 * here re-derive the pipeline row too. Tapping a risk row opens the nested
 * Risiko-Detail route (/deal/[id]/risk/[riskId]).
 */

import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  computeScore,
  formatEUR,
  scoreColor,
  type AmpelColor,
  type Measure,
  type Scenario,
} from '@dealpilot/core';

import { useDeals } from '../../../src/data/store';
import { colors } from '../../../src/theme/tokens';
import { type } from '../../../src/theme/typography';
import { Toast, useToast } from '../../../src/components/Toast';
import {
  DetailHeader,
  type DetailTab,
} from '../../../src/components/detail/DetailHeader';
import { OverviewTab } from '../../../src/components/detail/OverviewTab';
import { CalcTab, type CalcActions } from '../../../src/components/detail/CalcTab';
import { StubTab } from '../../../src/components/detail/StubTab';

export default function DealDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dealId = typeof id === 'string' ? id : '';
  const store = useDeals();
  const seed = store.getSeed(dealId);
  const state = store.getState(dealId);
  const toast = useToast();

  const [tab, setTab] = React.useState<DetailTab>('overview');

  const actions = React.useMemo<CalcActions>(
    () => ({
      setScenario: (s: Scenario) => store.setScenario(dealId, s),
      setScenarioPrice: (s: Scenario, p: number) =>
        store.setScenarioPrice(dealId, s, p),
      patchFinancing: (patch) => store.patchFinancing(dealId, patch),
      patchCosts: (patch) => store.patchCosts(dealId, patch),
      patchAssumptions: (patch) => store.patchAssumptions(dealId, patch),
      addMeasure: (m: Measure) => store.addMeasure(dealId, m),
    }),
    [store, dealId],
  );

  const openRisk = React.useCallback(
    (riskId: string) => router.push(`/deal/${dealId}/risk/${riskId}`),
    [router, dealId],
  );

  if (!seed || !state) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 40 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.missing}>Deal nicht gefunden.</Text>
      </View>
    );
  }

  const { deal } = state;
  const discarded = deal.dealStatus === 'verworfen';
  const { scoreVal } = computeScore(state.risks);
  const score: number | null = discarded ? null : scoreVal;
  const color: AmpelColor | null = discarded ? null : scoreColor(scoreVal);

  const headerTitle = deal.address ?? deal.ort;
  const meta = `${deal.objektart} · ${deal.ort} · ${deal.qm} m²`;
  const priceStr = formatEUR(deal.kaufpreis);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={headerTitle}
        meta={meta}
        priceStr={priceStr}
        score={score}
        color={color}
        tab={tab}
        onTab={setTab}
        onBack={() => router.back()}
        onKebab={() => toast.show('Aktionsmenü – bald verfügbar')}
        topInset={insets.top}
      />

      <View style={styles.body}>
        {tab === 'overview' && (
          <OverviewTab
            state={state}
            verdict={seed.verdict}
            breakdown={seed.scoreBreakdown}
            score={score}
            color={color}
            onToast={toast.show}
            onRiskPress={openRisk}
          />
        )}
        {tab === 'calc' && (
          <CalcTab state={state} actions={actions} onToast={toast.show} />
        )}
        {tab === 'docs' && (
          <StubTab
            title="Dokumente"
            note="Due-Diligence-Checkliste, Befunde und Upload-Flow folgen in einer späteren Phase."
            variant="docs"
            testID="docs-stub"
          />
        )}
        {tab === 'chat' && (
          <StubTab
            title="Chat"
            note="Der belegte KI-Chat zu diesem Deal folgt in einer späteren Phase."
            variant="chat"
            testID="chat-stub"
          />
        )}
      </View>

      <Toast controller={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  body: { flex: 1 },
  missing: { ...type.body, textAlign: 'center', color: colors.muted },
});
