import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { type } from '../theme/typography';

export interface SectionHeaderProps {
  label: string;
  count: number;
}

/** Status section header: uppercase mono label left, mono counter right. */
export function SectionHeader({ label, count }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  label: { ...type.monoLabel, fontSize: 11, letterSpacing: 1.3 },
  // Muted grey counter (design token #c9c4bb) — quieter than the label.
  count: { ...type.monoLabel, fontSize: 11, letterSpacing: 1.3, color: '#c9c4bb' },
});
