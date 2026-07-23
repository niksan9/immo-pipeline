/**
 * Onboarding · Profil (1.3, register only). "Wie heißt du?" — captures the
 * authoritative Vorname / Nachname (seeded from the Auth screen's Name field).
 * The avatar placeholder with a camera badge is a STUB (no real upload yet).
 * CTA persists the name via better-auth `updateUser`, then advances to the
 * KI-Hinweis step.
 */
import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { Toast, useToast } from '../../src/components/Toast';
import { BackIcon } from '../../src/components/icons';
import { PaperGradient } from '../../src/components/onboarding/visuals';
import { updateProfileName } from '../../src/lib/auth-client';
import { useOnboarding } from '../../src/lib/onboarding';
import { colors } from '../../src/theme/tokens';
import { fonts } from '../../src/theme/typography';

export default function OnboardingProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboarding = useOnboarding();
  const toast = useToast();

  const [firstName, setFirstName] = React.useState(onboarding.draftFirstName);
  const [lastName, setLastName] = React.useState(onboarding.draftLastName);
  const [saving, setSaving] = React.useState(false);

  const onNext = React.useCallback(async () => {
    const first = firstName.trim();
    const last = lastName.trim();
    // Keep the draft in sync so a back-and-forth in the sub-flow is preserved.
    onboarding.setDraftName(first, last);
    setSaving(true);
    try {
      // Best-effort: even if the profile update fails we continue — the name is
      // held in the draft and can be resaved. Consent is the mandatory step.
      await updateProfileName(first, last);
    } catch {
      // ignore — name persistence is not a hard gate for the sub-flow.
    } finally {
      setSaving(false);
      router.push('/onboarding/ai-notice');
    }
  }, [firstName, lastName, onboarding, router]);

  return (
    <View style={styles.root}>
      <PaperGradient />

      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          style={styles.back}
          testID="profile-back"
        >
          <BackIcon size={17} color="#23211d" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + 30 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.step}>SCHRITT 2 VON 2 · PROFIL</Text>
          <Text style={styles.headline}>Wie heißt du?</Text>
          <Text style={styles.sub}>
            Nur dein Name — den Rest übernimmt DealPilot.
          </Text>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Svg width={42} height={42} viewBox="0 0 42 42">
                <Circle cx={21} cy={15} r={7.5} fill="#c9c4bb" />
                <Path
                  d="M7 37c0-7.5 6-11.5 14-11.5s14 4 14 11.5"
                  fill="#c9c4bb"
                />
              </Svg>
              {/* STUB: camera badge does not open a picker yet. */}
              <Pressable
                onPress={() => toast.show('Foto hinzufügen · bald verfügbar')}
                accessibilityRole="button"
                accessibilityLabel="Foto hinzufügen"
                style={styles.cameraBadge}
                testID="profile-avatar"
              >
                <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
                  <Path
                    d="M3 10l.4-2.2 5-5 1.8 1.8-5 5L3 10z"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            </View>
          </View>

          <View style={styles.fields}>
            <View>
              <Text style={styles.fieldLabel}>VORNAME</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Niklas"
                placeholderTextColor={colors.faint}
                autoCapitalize="words"
                style={styles.input}
                testID="profile-first"
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>NACHNAME</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Bergmann"
                placeholderTextColor={colors.faint}
                autoCapitalize="words"
                style={styles.input}
                testID="profile-last"
              />
            </View>
          </View>

          <View style={{ height: 24 }} />
          <Pressable
            onPress={onNext}
            disabled={saving}
            accessibilityRole="button"
            style={styles.cta}
            testID="profile-next"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Weiter</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast controller={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e9e4db' },
  back: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 30, paddingTop: 26 },
  step: {
    fontFamily: fonts.mono600,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.greenText,
  },
  headline: {
    fontFamily: fonts.bricolage700,
    fontWeight: '800',
    fontSize: 30,
    letterSpacing: -0.6,
    color: '#23211d',
    marginTop: 12,
  },
  sub: {
    fontFamily: fonts.hanken400,
    fontSize: 15,
    color: '#6b6862',
    marginTop: 10,
    lineHeight: 22,
  },
  avatarWrap: { alignItems: 'center', marginTop: 34, marginBottom: 30 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2ded7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#23211d',
    borderWidth: 3,
    borderColor: '#f3eee5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: { gap: 12 },
  fieldLabel: {
    fontFamily: fonts.mono600,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8a867f',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e4df',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontFamily: fonts.hanken400,
    fontSize: 14.5,
    color: '#23211d',
  },
  cta: {
    width: '100%',
    backgroundColor: '#23211d',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: fonts.hanken600, fontSize: 15, color: '#fff' },
});
