import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useDeals } from '../../src/data/store';
import { colors, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/**
 * Stub deal-detail route. The full detail (Übersicht / Kalkulation / Dokumente /
 * Chat tabs) arrives in a later phase — for now it shows just the deal title so
 * the pipeline row navigation is wired end to end.
 */
export default function DealDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRow } = useDeals();
  const row = typeof id === 'string' ? getRow(id) : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
            <Path
              d="M13 5l-6 6 6 6"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{row ? row.title : 'Deal'}</Text>
        <Text style={styles.note}>Deal-Detail folgt in einer späteren Phase.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: spacing.xs,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl },
  title: { ...type.screenTitle, fontSize: 18 },
  note: { ...type.body, color: colors.muted, marginTop: spacing.xs },
});
