/**
 * Risiko-Detail (Lebenszyklus) route: /deal/[id]/risk/[riskId].
 *
 * Reads the live risk from the store and renders <RiskDetailView />. Every
 * lifecycle action delegates to the store's risk actions (which go through
 * @dealpilot/core's state machine) and fires the matching confirmation toast.
 * Because the store is the single source of truth, resolving a risk here
 * immediately re-derives the Übersicht risk list, the "einkalkuliert −X €"
 * header, GIK/cashflow, the score + Ampel colour and the KI-Urteil max price.
 */

import * as React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { formatNumber, type ContextProposal } from '@dealpilot/core';

import { useDeals } from '../../../../src/data/store';
import { colors } from '../../../../src/theme/tokens';
import { fonts, type } from '../../../../src/theme/typography';
import { BackIcon } from '../../../../src/components/icons';
import { Toast, useToast } from '../../../../src/components/Toast';
import { RiskDetailView } from '../../../../src/components/detail/RiskDetailView';

export default function RiskDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, riskId } = useLocalSearchParams<{ id: string; riskId: string }>();
  const dealId = typeof id === 'string' ? id : '';
  const rId = typeof riskId === 'string' ? riskId : '';
  const store = useDeals();
  const seed = store.getSeed(dealId);
  const state = store.getState(dealId);
  const risk = state?.risks.find((r) => r.id === rId);
  const toast = useToast();

  const dealTitle = seed ? state?.deal.address ?? state?.deal.ort ?? '' : '';

  const cover = React.useCallback(() => {
    if (!risk) return;
    store.transitionRisk(dealId, rId, 'covered');
    toast.show(`In Kosten übernommen · −${formatNumber(risk.estimate)} €`);
  }, [store, dealId, rId, risk, toast]);

  const accept = React.useCallback(() => {
    store.transitionRisk(dealId, rId, 'accepted');
    toast.show('Akzeptiert · Kosten entfallen');
  }, [store, dealId, rId, toast]);

  const question = React.useCallback(() => {
    store.transitionRisk(dealId, rId, 'question');
    toast.show('Fragenkatalog für Verkäufer erstellt');
  }, [store, dealId, rId, toast]);

  const reopen = React.useCallback(() => {
    store.transitionRisk(dealId, rId, 'open');
    toast.show('Risiko neu eröffnet');
  }, [store, dealId, rId, toast]);

  const applyProposal = React.useCallback(
    (proposal: ContextProposal) => {
      store.applyRiskContext(dealId, rId, proposal);
      toast.show(
        proposal.status === 'accepted'
          ? 'Kontext übernommen · Kosten entfallen'
          : `Kontext übernommen · −${formatNumber(proposal.cost)} €`,
      );
    },
    [store, dealId, rId, toast],
  );

  const surveyor = React.useCallback(() => {
    toast.show('Bausachverständigen angefragt · Kontakt folgt');
  }, [toast]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          testID="risk-back"
          style={styles.backBtn}
        >
          <BackIcon size={20} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Risiko-Detail</Text>
          {!!dealTitle && <Text style={styles.headerSub}>{dealTitle}</Text>}
        </View>
      </View>

      {risk ? (
        <RiskDetailView
          risk={risk}
          onCover={cover}
          onAccept={accept}
          onQuestion={question}
          onReopen={reopen}
          onApplyProposal={applyProposal}
          onSurveyor={surveyor}
        />
      ) : (
        <View style={styles.missingWrap}>
          <Text style={styles.missing}>Risiko nicht gefunden.</Text>
        </View>
      )}

      <Toast controller={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  backBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.hanken600, fontSize: 15, color: colors.ink },
  headerSub: { fontFamily: fonts.mono400, fontSize: 11, color: colors.muted, marginTop: 2 },
  missingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...type.body, color: colors.muted },
});
