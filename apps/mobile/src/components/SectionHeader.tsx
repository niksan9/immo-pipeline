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
    paddingHorizontal: 18,
    paddingTop: spacing.lg,
    paddingBottom: 6,
  },
  label: { ...type.monoLabel },
  count: { ...type.monoLabel },
});
