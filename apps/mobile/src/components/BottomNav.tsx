import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { type } from '../theme/typography';
import { MarketIcon, PipelineIcon, PlusIcon, ProfileIcon } from './icons';

export interface BottomNavProps {
  /** Non-functional stubs surface a small hint via this callback. */
  onStub?: (label: string) => void;
}

/**
 * Bottom navigation: Pipeline · Markt · + (central, emphasized) · Profil.
 * Markt / Profil / + are non-functional stubs for now.
 */
export function BottomNav({ onStub }: BottomNavProps) {
  return (
    <View style={styles.nav}>
      <View style={styles.item}>
        <PipelineIcon color={colors.ink} />
        <Text style={[styles.label, styles.active]}>Pipeline</Text>
      </View>

      <Pressable
        style={styles.item}
        onPress={() => onStub?.('Markt')}
        accessibilityRole="button"
        accessibilityLabel="Markt"
      >
        <MarketIcon color={colors.faintAlt} />
        <Text style={[styles.label, styles.inactive]}>Markt</Text>
      </Pressable>

      <Pressable
        style={styles.plus}
        onPress={() => onStub?.('Neuer Deal')}
        accessibilityRole="button"
        accessibilityLabel="Neuer Deal"
      >
        <PlusIcon />
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => onStub?.('Profil')}
        accessibilityRole="button"
        accessibilityLabel="Profil"
      >
        <ProfileIcon color={colors.faintAlt} />
        <Text style={[styles.label, styles.inactive]}>Profil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingTop: 11,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  item: { alignItems: 'center', gap: 3 },
  plus: {
    width: 48,
    height: 48,
    borderRadius: radii.buttonLg,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  label: { ...type.navLabel },
  active: { color: colors.ink },
  inactive: { color: colors.faintAlt, fontFamily: type.body.fontFamily },
});
