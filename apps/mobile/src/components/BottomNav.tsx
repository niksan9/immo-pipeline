import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { type } from '../theme/typography';
import { MarketIcon, PipelineIcon, PlusIcon, ProfileIcon } from './icons';

export interface BottomNavProps {
  /** Non-functional stubs surface a small hint via this callback. */
  onStub?: (label: string) => void;
  /** Central + button — opens the "Deal anlegen" overlay. */
  onNewDeal?: () => void;
  /** Opens the profile screen (email · sync status · sign-out). */
  onProfile?: () => void;
}

/**
 * Bottom navigation: Pipeline · Markt · + (central, emphasized) · Profil.
 * Markt is a non-functional stub; + opens the create overlay; Profil opens the
 * profile screen.
 */
export function BottomNav({ onStub, onNewDeal, onProfile }: BottomNavProps) {
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
        onPress={onNewDeal}
        accessibilityRole="button"
        accessibilityLabel="Neuer Deal"
        testID="nav-new-deal"
      >
        <PlusIcon />
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={onProfile}
        accessibilityRole="button"
        accessibilityLabel="Profil"
        testID="nav-profile"
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
