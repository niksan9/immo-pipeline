import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { formatEUR, formatSignedEUR } from '@dealpilot/core';

import { useDeals } from '../src/data/store';
import { useSession, firstNameOf } from '../src/lib/auth-client';
import { DealRow } from '../src/components/DealRow';
import { SectionHeader } from '../src/components/SectionHeader';
import { SearchBar } from '../src/components/SearchBar';
import { Toast, useToast } from '../src/components/Toast';
import { PipelineActionMenu } from '../src/components/PipelineActionMenu';
import { CreateDealOverlay } from '../src/components/CreateDealOverlay';
import { KebabIcon, FabPlusIcon } from '../src/components/icons';
import { SORT_LABEL, initials, type SortMode } from '../src/lib/pipeline';
import { colors } from '../src/theme/tokens';
import { fonts, type } from '../src/theme/typography';

export default function PipelineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sections, portfolio, query, setQuery, sortMode, setSortMode, createDeal } =
    useDeals();
  const { data: session } = useSession();
  const toast = useToast();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  const user = session?.user ?? null;
  const firstName = firstNameOf(user);
  const greetingName = firstName || 'Willkommen';
  const avatarInitials = user?.name ? initials(user.name) : firstName ? initials(firstName) : 'D';

  const cashflowStr = formatSignedEUR(portfolio.baseCashflowSum);
  const cashflowColor = portfolio.baseCashflowSum >= 0 ? colors.green : colors.red;

  const openDeal = React.useCallback(
    (id: string) => router.push(`/deal/${id}`),
    [router],
  );

  const pickSort = React.useCallback(
    (mode: SortMode) => {
      setSortMode(mode);
      setMenuOpen(false);
      toast.show(`Sortiert nach ${SORT_LABEL[mode]}`);
    },
    [setSortMode, toast],
  );

  const openCreate = React.useCallback(() => {
    setMenuOpen(false);
    setCreateOpen(true);
  }, []);

  return (
    <View style={styles.root}>
      {/* Non-scrolling paper header: greeting · portfolio KPIs · search. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greetHi}>Guten Morgen</Text>
            <Text style={type.greetingName} testID="pipeline-greeting">
              {greetingName}
            </Text>
          </View>
          <View style={styles.greetActions}>
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={styles.kebab}
              accessibilityRole="button"
              accessibilityLabel="Aktionsmenü"
              testID="pipeline-kebab"
            >
              <KebabIcon />
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile')}
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel="Profil öffnen"
              testID="pipeline-avatar"
            >
              <Text style={styles.avatarText}>{avatarInitials}</Text>
            </Pressable>
          </View>
        </View>

        {/* Gesamtwert card */}
        <View style={styles.valueCard}>
          <View style={styles.valueTop}>
            <Text style={styles.valueLabel}>GESAMTWERT</Text>
            <Text style={styles.valuePill} testID="portfolio-count">
              {portfolio.activeCount} DEALS
            </Text>
          </View>
          <Text
            style={[type.portfolioBig, styles.valueBig]}
            numberOfLines={1}
            testID="portfolio-gesamtwert"
          >
            {formatEUR(portfolio.gesamtwert)}
          </Text>
          <Text style={styles.valueSub}>
            Summe der Kaufpreise deiner aktiven Deals
          </Text>
        </View>

        {/* Two KPI tiles */}
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text
              style={[styles.tileNum, { color: cashflowColor }]}
              testID="portfolio-cashflow"
            >
              {cashflowStr}
            </Text>
            <Text style={styles.tileLabel}>Cashflow/M · Base Case</Text>
          </View>
          <View style={styles.tile}>
            <Text
              style={[styles.tileNum, { color: colors.yellow }]}
              testID="portfolio-risks"
            >
              {portfolio.openRiskSum}
            </Text>
            <Text style={styles.tileLabel}>offene Risiken</Text>
          </View>
        </View>

        <SearchBar value={query} onChangeText={setQuery} />
      </View>

      {/* Scrolling white list panel (radius 22 22 0 0). */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {sections.map((section) => (
          <View key={section.key}>
            <SectionHeader label={section.label} count={section.count} />
            {section.rows.map((row) => (
              <DealRow key={row.id} row={row} onPress={openDeal} />
            ))}
          </View>
        ))}
        {/* Bottom padding so the last row clears the floating action button. */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating action button → create-deal flow. */}
      <Pressable
        onPress={openCreate}
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        accessibilityRole="button"
        accessibilityLabel="Deal anlegen"
        testID="pipeline-fab"
      >
        <FabPlusIcon />
      </Pressable>

      <PipelineActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        sortMode={sortMode}
        onSort={pickSort}
        onNewDeal={openCreate}
      />

      <CreateDealOverlay
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(input) => {
          const id = createDeal(input);
          setCreateOpen(false);
          router.push(`/deal/${id}`);
          toast.show('Deal angelegt');
        }}
        onToast={toast.show}
      />

      <Toast controller={toast} bottom={insets.bottom + 84} />
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 18, paddingBottom: 12 },

  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  greetHi: { fontFamily: fonts.hanken500, fontSize: 12, color: colors.muted2 },
  greetActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kebab: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2ded7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.hanken700, fontSize: 14, color: colors.muted },

  valueCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    ...CARD_SHADOW,
  },
  valueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueLabel: {
    fontFamily: fonts.mono500,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.muted2,
  },
  valuePill: {
    fontFamily: fonts.mono600,
    fontSize: 10,
    color: colors.muted,
    backgroundColor: '#f0ede8',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  valueBig: { marginTop: 6 },
  valueSub: {
    fontFamily: fonts.hanken400,
    fontSize: 11.5,
    color: colors.muted2,
    marginTop: 3,
  },

  tiles: { flexDirection: 'row', gap: 9, marginTop: 11 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    ...CARD_SHADOW,
  },
  tileNum: { fontFamily: fonts.mono600, fontSize: 15 },
  tileLabel: {
    fontFamily: fonts.hanken400,
    fontSize: 9.5,
    color: colors.muted2,
    marginTop: 2,
  },

  list: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  listContent: { paddingBottom: 8 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.greenText,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.greenText,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
});
