import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useDeals } from '../src/data/store';
import { DealRow } from '../src/components/DealRow';
import { SectionHeader } from '../src/components/SectionHeader';
import { SearchBar } from '../src/components/SearchBar';
import { BottomNav } from '../src/components/BottomNav';
import { Toast, useToast } from '../src/components/Toast';
import { PipelineActionMenu } from '../src/components/PipelineActionMenu';
import { CreateDealOverlay } from '../src/components/CreateDealOverlay';
import { KebabIcon } from '../src/components/icons';
import { SORT_LABEL, type SortMode } from '../src/lib/pipeline';
import { colors, spacing } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

export default function PipelineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sections, query, setQuery, sortMode, setSortMode, createDeal } =
    useDeals();
  const toast = useToast();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  const showStub = React.useCallback(
    (label: string) => toast.show(`${label} · bald verfügbar`),
    [toast],
  );

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
      {/* White header block (title + kebab) */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Text style={type.screenTitle}>Pipeline</Text>
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={styles.kebab}
            accessibilityRole="button"
            accessibilityLabel="Aktionsmenü"
            testID="pipeline-kebab"
          >
            <KebabIcon />
          </Pressable>
        </View>
        <SearchBar value={query} onChangeText={setQuery} />
      </View>

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
        <View style={{ height: 14 }} />
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom }}>
        <BottomNav
          onStub={showStub}
          onNewDeal={openCreate}
          onProfile={() => router.push('/profile')}
        />
      </View>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  headerWrap: { backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: spacing.sm,
  },
  kebab: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1, backgroundColor: colors.bgApp },
  listContent: { paddingBottom: 8 },
});
