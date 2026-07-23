import * as React from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useDeals } from '../src/data/store';
import { DealRow } from '../src/components/DealRow';
import { SectionHeader } from '../src/components/SectionHeader';
import { SearchBar } from '../src/components/SearchBar';
import { BottomNav } from '../src/components/BottomNav';
import { KebabIcon } from '../src/components/icons';
import { colors, spacing } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

export default function PipelineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sections, query, setQuery } = useDeals();
  const [toast, setToast] = React.useState<string | null>(null);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  const showStub = React.useCallback(
    (label: string) => {
      setToast(`${label} · bald verfügbar`);
      toastOpacity.setValue(0);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 1800);
    },
    [toastOpacity],
  );

  const openDeal = React.useCallback(
    (id: string) => router.push(`/deal/${id}`),
    [router],
  );

  return (
    <View style={styles.root}>
      {/* White header block (title + kebab) */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Text style={type.screenTitle}>Pipeline</Text>
          <Pressable
            onPress={() => showStub('Aktionsmenü')}
            style={styles.kebab}
            accessibilityRole="button"
            accessibilityLabel="Aktionsmenü"
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
        <BottomNav onStub={showStub} />
      </View>

      {toast != null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: insets.bottom + 84, opacity: toastOpacity },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
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
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  toastText: {
    ...type.body,
    color: '#f4f2ef',
  },
});
