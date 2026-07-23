/**
 * Onboarding · KI-Hinweis (1.4, register only). Explains the KI limits + the
 * disclaimer, then a MANDATORY "Verstanden & akzeptiert" checkbox gates the CTA.
 * On "Weiter" we record consent (AGB + KI-Hinweis) server-side and locally, then
 * leave the sub-flow into the app.
 *
 * TODO(legal): the three principles + footnote are PLACEHOLDER copy from the
 * design; the final legal wording ships with the AGB. Keep versions in
 * `consent.ts` in sync when the real text lands.
 */
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Checkbox } from '../../src/components/Checkbox';
import { Toast, useToast } from '../../src/components/Toast';
import { useSession } from '../../src/lib/auth-client';
import { recordConsent } from '../../src/lib/consent';
import { useOnboarding } from '../../src/lib/onboarding';
import { colors } from '../../src/theme/tokens';
import { fonts } from '../../src/theme/typography';

interface Principle {
  n: string;
  title: string;
  body: string;
  accent: string;
}

const PRINCIPLES: Principle[] = [
  {
    n: '01',
    title: 'Die KI analysiert',
    body: 'Sie liest Dokumente und rechnet Cashflow, Rendite & Risiken.',
    accent: '#c9c4bb',
  },
  {
    n: '02',
    title: 'Fehler sind möglich',
    body: 'Ergebnisse sind Hinweise, keine Wahrheiten — Irrtümer nicht ausgeschlossen.',
    accent: '#c9c4bb',
  },
  {
    n: '03',
    title: 'Du prüfst & entscheidest',
    body: 'Alle Zahlen, Daten & Fakten liegen in deiner Verantwortung.',
    accent: colors.greenText,
  },
];

export default function AiNoticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboarding = useOnboarding();
  const toast = useToast();
  const { data: session } = useSession();

  const [understood, setUnderstood] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const onFinish = React.useCallback(async () => {
    if (!understood) {
      toast.show('Bitte bestätigen, dass du das verstanden hast');
      return;
    }
    setSaving(true);
    try {
      // Records both blocks server-side (POST /api/consent) + locally. Throws on
      // failure so we keep the user here rather than entering the app unrecorded.
      await recordConsent(session?.user?.id ?? null);
      onboarding.completeOnboarding();
      router.replace('/');
    } catch {
      toast.show('Konnte nicht speichern. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  }, [understood, session, onboarding, router, toast]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.eyebrow}>SO ARBEITEN WIR</Text>
        <Text style={styles.headline}>KI &amp; Mensch —{'\n'}drei Grundsätze</Text>

        <View style={styles.list}>
          {PRINCIPLES.map((p, i) => (
            <View
              key={p.n}
              style={[
                styles.principle,
                i === PRINCIPLES.length - 1 && styles.principleLast,
              ]}
            >
              <Text style={[styles.principleNum, { color: p.accent }]}>{p.n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.principleTitle}>{p.title}</Text>
                <Text style={styles.principleBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          Keine Rechts-, Steuer- oder Anlageberatung. Keine Gewähr für Richtigkeit
          oder Vollständigkeit.
        </Text>

        <View style={{ height: 22 }} />

        <Checkbox
          checked={understood}
          onToggle={() => setUnderstood((v) => !v)}
          checkedColor={colors.greenText}
          testID="ai-notice-check"
        >
          <Text style={styles.checkLabel}>Verstanden &amp; akzeptiert</Text>
        </Checkbox>

        <Pressable
          onPress={onFinish}
          disabled={saving}
          accessibilityRole="button"
          style={[styles.cta, !understood && styles.ctaLocked]}
          testID="ai-notice-finish"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Weiter</Text>
          )}
        </Pressable>
      </ScrollView>

      <Toast controller={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f5f2' },
  body: { flexGrow: 1, paddingHorizontal: 30 },
  eyebrow: {
    fontFamily: fonts.mono600,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.greenText,
  },
  headline: {
    fontFamily: fonts.bricolage700,
    fontWeight: '800',
    fontSize: 27,
    letterSpacing: -0.54,
    lineHeight: 30,
    color: '#23211d',
    marginTop: 11,
  },
  list: { marginTop: 24 },
  principle: {
    flexDirection: 'row',
    gap: 15,
    paddingVertical: 17,
    borderTopWidth: 1,
    borderTopColor: '#ece9e4',
  },
  principleLast: { borderBottomWidth: 1, borderBottomColor: '#ece9e4' },
  principleNum: {
    fontFamily: fonts.mono600,
    fontSize: 22,
    width: 28,
  },
  principleTitle: {
    fontFamily: fonts.hanken600,
    fontSize: 15,
    color: '#23211d',
  },
  principleBody: {
    fontFamily: fonts.hanken400,
    fontSize: 13,
    color: '#6b6862',
    lineHeight: 19,
    marginTop: 3,
  },
  footnote: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: '#a7a29a',
    lineHeight: 17,
    marginTop: 18,
  },
  checkLabel: {
    fontFamily: fonts.hanken500,
    fontSize: 13.5,
    color: '#23211d',
  },
  cta: {
    width: '100%',
    backgroundColor: colors.greenText,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  ctaLocked: { backgroundColor: '#bdbab3' },
  ctaText: { fontFamily: fonts.hanken600, fontSize: 15, color: '#fff' },
});
