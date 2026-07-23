/**
 * Visual furniture for the onboarding flow — kept out of the screen files so the
 * screens read as pure layout + state.
 *
 *  - {@link PaperGradient}  radial paper backdrop (welcome / profile).
 *  - {@link DriftingCards}  three real deal cards that slowly drift (the RN
 *    `Animated` equivalent of the prototype `cdrift` keyframe: translateY + a
 *    slight rotation, 7–8.6 s loops with staggered delays).
 *  - {@link BlurredPipeline} the auth backdrop: skeleton deal cards dimmed to
 *    ~.62 opacity under a light gradient overlay. A true Gaussian blur would
 *    pull in `expo-blur`; per the brief we approximate it with low opacity +
 *    overlay (no new dependency).
 *  - {@link LogoLockup}, {@link AppleMark}, {@link GoogleMark} brand marks.
 */

import * as React from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { fonts } from '../../theme/typography';

/** Radial paper backdrop (#f3eee5 → #ded8cd on a #e9e4db base). */
export function PaperGradient() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="paper" cx="50%" cy="-6%" rx="120%" ry="54%">
          <Stop offset="0" stopColor="#f3eee5" />
          <Stop offset="1" stopColor="#ded8cd" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#paper)" />
    </Svg>
  );
}

interface DriftCard {
  score: number;
  accent: string;
  tileBg: string;
  title: string;
  sub: string;
  left?: number;
  right?: number;
  top: number;
  width: number;
  durationMs: number;
  delayMs: number;
}

const CARDS: DriftCard[] = [
  {
    score: 86,
    accent: '#2e6f52',
    tileBg: '#e7f0ea',
    title: 'MFH · Südvorstadt',
    sub: '5,2 % · +410 €/M',
    left: 22,
    top: 6,
    width: 270,
    durationMs: 7000,
    delayMs: 0,
  },
  {
    score: 63,
    accent: '#c2882a',
    tileBg: '#f6efe0',
    title: 'ETW · Lindenau',
    sub: '4,1 % · 1 Risiko',
    right: 18,
    top: 116,
    width: 256,
    durationMs: 8600,
    delayMs: 600,
  },
  {
    score: 48,
    accent: '#c1442d',
    tileBg: '#f7e8e2',
    title: 'ETW · Ringstraße',
    sub: '3,2 % · Erbpacht',
    left: 38,
    top: 238,
    width: 238,
    durationMs: 7800,
    delayMs: 1100,
  },
];

/** One drifting card with its own looped translate + rotate animation. */
function DriftingCard({ card }: { card: DriftCard }) {
  const t = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: card.durationMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          delay: card.delayMs,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: card.durationMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, card.durationMs, card.delayMs]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = t.interpolate({
    inputRange: [0, 1],
    outputRange: ['-0.6deg', '0.6deg'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: card.width,
          top: card.top,
          left: card.left,
          right: card.right,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: card.accent }]} />
      <View style={[styles.cardTile, { backgroundColor: card.tileBg }]}>
        <Text style={[styles.cardScore, { color: card.accent }]}>
          {card.score}
        </Text>
        <Text style={[styles.cardScoreLabel, { color: card.accent }]}>SCORE</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardSub}>{card.sub}</Text>
      </View>
    </Animated.View>
  );
}

/** The full drifting-cards band shown behind the welcome sheet. */
export function DriftingCards() {
  return (
    <View style={styles.driftBand} pointerEvents="none">
      {CARDS.map((c) => (
        <DriftingCard key={c.title} card={c} />
      ))}
    </View>
  );
}

/** Skeleton deal cards + light gradient overlay behind the auth sheet. */
export function BlurredPipeline() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.blurLayer}>
        <View style={[styles.skeleton, { left: 20, top: 150, width: 270 }]}>
          <View style={[styles.cardAccent, { backgroundColor: '#2e6f52' }]} />
          <View style={[styles.skelTile, { backgroundColor: '#e7f0ea' }]} />
          <View style={styles.skelBody}>
            <View style={[styles.skelBar, { width: '70%' }]} />
            <View style={[styles.skelBar, { width: '50%', marginTop: 9 }]} />
          </View>
        </View>
        <View style={[styles.skeleton, { right: 16, top: 262, width: 256 }]}>
          <View style={[styles.cardAccent, { backgroundColor: '#c2882a' }]} />
          <View style={[styles.skelTile, { backgroundColor: '#f6efe0' }]} />
          <View style={styles.skelBody}>
            <View style={[styles.skelBar, { width: '62%' }]} />
            <View style={[styles.skelBar, { width: '46%', marginTop: 9 }]} />
          </View>
        </View>
      </View>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="authOverlay" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e9e4db" stopOpacity={0.2} />
            <Stop offset="0.42" stopColor="#e9e4db" stopOpacity={0.58} />
            <Stop offset="1" stopColor="#e9e4db" stopOpacity={0.58} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#authOverlay)" />
      </Svg>
    </View>
  );
}

/** DealPilot logo lockup (dark rounded square + diamond + wordmark). */
export function LogoLockup() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.logoMark}>
        <View style={styles.logoDiamond} />
      </View>
      <Text style={styles.logoText}>DealPilot</Text>
    </View>
  );
}

/** Apple glyph (fills with the current text ink). */
export function AppleMark({ size = 16, color = '#23211d' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.44-4.28-1.33-1.95-3.4-2.22-4.13-2.25-1.76-.18-3.43 1.03-4.32 1.03-.89 0-2.26-1.01-3.72-.98-1.91.03-3.68 1.11-4.66 2.82-1.99 3.45-.51 8.55 1.42 11.35.94 1.37 2.06 2.91 3.53 2.85 1.42-.06 1.95-.92 3.66-.92 1.71 0 2.19.92 3.69.89 1.53-.03 2.5-1.4 3.43-2.78 1.08-1.59 1.53-3.13 1.55-3.21-.03-.01-2.98-1.14-3.02-4.19zM14.28 3.93c.78-.95 1.31-2.27 1.16-3.58-1.13.05-2.49.75-3.3 1.7-.72.84-1.36 2.18-1.19 3.47 1.26.1 2.55-.64 3.33-1.59z" />
    </Svg>
  );
}

/** Google 4-colour "G". */
export function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  driftBand: {
    position: 'absolute',
    top: 118,
    left: 0,
    right: 0,
    height: 380,
    overflow: 'hidden',
  },
  card: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  cardAccent: { width: 4 },
  cardTile: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  cardScore: { fontFamily: fonts.mono600, fontSize: 21 },
  cardScoreLabel: {
    fontFamily: fonts.mono500,
    fontSize: 6.5,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  cardBody: { flex: 1, paddingVertical: 11, paddingHorizontal: 13 },
  cardTitle: { fontFamily: fonts.hanken600, fontSize: 13.5, color: '#23211d' },
  cardSub: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    color: '#6b6862',
    marginTop: 3,
  },
  blurLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.62,
  },
  skeleton: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  skelTile: { width: 52, height: 70 },
  skelBody: { flex: 1, paddingVertical: 11, paddingHorizontal: 13 },
  skelBar: { height: 11, borderRadius: 3, backgroundColor: '#e7e4df' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoMark: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#23211d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDiamond: {
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
  },
  logoText: {
    fontFamily: fonts.bricolage700,
    fontSize: 16,
    color: '#23211d',
    letterSpacing: -0.16,
  },
});
