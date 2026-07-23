import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import type { DealRowVM } from '../lib/pipeline';
import { AvatarStack } from './Avatar';
import { WarningIcon } from './icons';

export interface DealRowProps {
  row: DealRowVM;
  onPress?: (id: string) => void;
}

/**
 * Terminal-style deal row (no card look): 4px colour rail, tinted 54px score
 * column, content (title / mono subtitle / KPI line). Discarded rows render
 * dimmed with a gray rail and "—" instead of a score.
 */
export function DealRow({ row, onPress }: DealRowProps) {
  const handlePress = React.useCallback(() => onPress?.(row.id), [onPress, row.id]);

  if (row.discarded) {
    return (
      <Pressable
        onPress={handlePress}
        testID={`deal-row-${row.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${row.title}, verworfen`}
        style={[styles.container, styles.discarded]}
      >
        <View style={[styles.rail, { backgroundColor: colors.railDiscarded }]} />
        <View style={styles.scoreColDiscarded}>
          <Text style={styles.dash}>—</Text>
        </View>
        <View style={styles.contentDiscarded}>
          <Text style={type.cardTitleSm}>{row.title}</Text>
          <Text style={styles.discardNote}>{row.subtitle}</Text>
        </View>
      </Pressable>
    );
  }

  const style = row.style!;

  return (
    <Pressable
      onPress={handlePress}
      testID={`deal-row-${row.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, Score ${row.scoreStr}`}
      style={styles.container}
    >
      <View style={[styles.rail, { backgroundColor: style.rail }]} />

      <View style={[styles.scoreCol, { backgroundColor: style.softBg }]}>
        <Text style={[type.scoreNum, { color: style.accent }]}>{row.scoreStr}</Text>
        <Text style={[type.scoreLabel, styles.scoreLabel, { color: style.accent }]}>
          SCORE
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {row.title}
          </Text>
          {row.sharedInitials.length > 0 && (
            <AvatarStack initials={row.sharedInitials} />
          )}
        </View>

        <Text style={styles.subtitle}>{row.subtitle}</Text>

        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>{row.priceStr}</Text>
          <Text style={styles.kpi}>· {row.yieldStr}</Text>
          {row.hasRisk && (
            <View style={styles.riskWrap}>
              <Text style={[styles.kpi, styles.riskDot]}>· </Text>
              <WarningIcon size={12} color={style.accent} />
              <Text style={[styles.kpi, { color: style.accent, marginLeft: 3 }]}>
                {row.riskLabelStr}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoftAlt,
  },
  discarded: { opacity: 0.62 },
  rail: { width: 4 },

  scoreCol: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  scoreLabel: { marginTop: 3 },
  scoreColDiscarded: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dash: {
    fontFamily: type.scoreNum.fontFamily,
    fontSize: 18,
    color: colors.faintAlt,
  },

  content: { flex: 1, minWidth: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  contentDiscarded: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: 11 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  title: { ...type.cardTitle, flexShrink: 1 },
  subtitle: { ...type.monoSub, marginTop: 3 },
  discardNote: { ...type.monoSub, color: colors.muted2, marginTop: 1 },

  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 7,
    columnGap: 6,
  },
  kpi: { ...type.monoKpi },
  riskWrap: { flexDirection: 'row', alignItems: 'center' },
  riskDot: { marginRight: 0 },
});
