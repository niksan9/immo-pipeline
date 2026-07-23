/**
 * Fixed Deal-Detail header: back-arrow row + ⋮, score field (tinted by score
 * colour) + title/meta/price, and the 4-tab bar. Stays above the tab content.
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AmpelColor } from '@dealpilot/core';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { ampelStyle } from '../../lib/pipeline';
import { BackIcon, KebabIcon } from '../icons';

export type DetailTab = 'overview' | 'calc' | 'docs' | 'chat';

export const TAB_LABELS: Record<DetailTab, string> = {
  overview: 'Übersicht',
  calc: 'Kalkulation',
  docs: 'Dokumente',
  chat: 'Chat',
};

const TAB_ORDER: DetailTab[] = ['overview', 'calc', 'docs', 'chat'];

export interface DetailHeaderProps {
  title: string;
  meta: string;
  priceStr: string;
  /** null for discarded deals → dash + gray tint. */
  score: number | null;
  color: AmpelColor | null;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onBack: () => void;
  onKebab: () => void;
  topInset: number;
}

export function DetailHeader({
  title,
  meta,
  priceStr,
  score,
  color,
  tab,
  onTab,
  onBack,
  onKebab,
  topInset,
}: DetailHeaderProps) {
  const style = color ? ampelStyle(color) : null;
  const scoreBg = style ? style.softBg : colors.chipBg;
  const scoreFg = style ? style.accent : colors.faintAlt;

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 6 }]}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <BackIcon />
        </Pressable>
        <Pressable
          onPress={onKebab}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Aktionsmenü"
        >
          <KebabIcon />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <View style={[styles.scoreField, { backgroundColor: scoreBg }]} testID="detail-score-field">
          <Text style={[styles.scoreNum, { color: scoreFg }]}>
            {score == null ? '—' : String(score)}
          </Text>
          <Text style={[styles.scoreLabel, { color: scoreFg }]}>SCORE</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta}>{meta}</Text>
          <Text style={styles.price}>{priceStr}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TAB_ORDER.map((key) => {
          const active = key === tab;
          return (
            <Pressable
              key={key}
              onPress={() => onTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`tab-${key}`}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, { color: active ? colors.ink : colors.faint }]}>
                {TAB_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
  },
  scoreField: {
    width: 54,
    height: 54,
    borderRadius: radii.score,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontFamily: fonts.bricolage700,
    fontSize: 22,
    lineHeight: 24,
  },
  scoreLabel: {
    fontFamily: fonts.mono500,
    fontSize: 7.5,
    letterSpacing: 0.9,
    marginTop: 2,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 18,
    letterSpacing: -0.18,
    color: colors.ink,
  },
  meta: { ...type.monoSub, marginTop: 3 },
  price: { fontFamily: fonts.mono500, fontSize: 12, color: colors.ink2, marginTop: 3 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.ink },
  tabLabel: { fontFamily: fonts.hanken600, fontSize: 12.5 },
});
