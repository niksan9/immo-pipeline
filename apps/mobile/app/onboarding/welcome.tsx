/**
 * Onboarding · Welcome (1.1). Paper backdrop with drifting deal cards; a bottom
 * sheet rises on mount (the `sheetup` keyframe). "Loslegen" → auth in register
 * mode, "Ich habe schon ein Konto" → auth in login mode.
 */
import * as React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  DriftingCards,
  LogoLockup,
  PaperGradient,
} from '../../src/components/onboarding/visuals';
import { fonts } from '../../src/theme/typography';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // `sheetup`: opacity 0→1, translateY 46→0 over .7s cubic-bezier(.2,.7,.2,1).
  const rise = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 700,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [rise]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [46, 0] });

  return (
    <View style={styles.root}>
      <PaperGradient />
      <DriftingCards />
      <View style={{ flex: 1 }} pointerEvents="none" />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 40, opacity: rise, transform: [{ translateY }] },
        ]}
      >
        <LogoLockup />
        <Text style={styles.headline}>Vom Exposé zur{'\n'}Entscheidung.</Text>
        <Text style={styles.sub}>
          Analysiere jeden Deal, bevor du bietest — Zahlen, Risiken und Rendite
          auf einen Blick.
        </Text>
        <Pressable
          onPress={() => router.push('/onboarding/auth?mode=register')}
          accessibilityRole="button"
          style={styles.primary}
          testID="welcome-register"
        >
          <Text style={styles.primaryText}>Loslegen</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/onboarding/auth?mode=login')}
          accessibilityRole="button"
          style={styles.secondary}
          testID="welcome-login"
        >
          <Text style={styles.secondaryText}>Ich habe schon ein Konto</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e9e4db' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 34,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -22 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 20,
  },
  headline: {
    fontFamily: fonts.bricolage700,
    fontWeight: '800',
    fontSize: 29,
    letterSpacing: -0.58,
    lineHeight: 31,
    color: '#23211d',
    marginTop: 20,
  },
  sub: {
    fontFamily: fonts.hanken400,
    fontSize: 15,
    color: '#6b6862',
    marginTop: 12,
    lineHeight: 22,
  },
  primary: {
    width: '100%',
    backgroundColor: '#23211d',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryText: { fontFamily: fonts.hanken600, fontSize: 15, color: '#fff' },
  secondary: { width: '100%', paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#23211d' },
});
