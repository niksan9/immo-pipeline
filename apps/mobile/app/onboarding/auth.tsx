/**
 * Onboarding · Auth (1.2). One sheet with an Anmelden / Registrieren segment
 * toggle over a blurred-pipeline backdrop.
 *
 *  - Register adds a Name field on top and a mandatory AGB checkbox; the CTA and
 *    the social buttons stay dimmed and, when tapped, toast until AGB is ticked.
 *  - Email/password is the real path (better-auth). Apple / Google are STUBS:
 *    real brand marks, but a "bald verfügbar" toast on tap.
 *  - Login success → the gate routes into the app. Register success → seed the
 *    draft name, enter the sub-flow, push to the Profil step.
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Segmented } from '../../src/components/Segmented';
import { Checkbox } from '../../src/components/Checkbox';
import { Toast, useToast } from '../../src/components/Toast';
import { BackIcon } from '../../src/components/icons';
import {
  AppleMark,
  BlurredPipeline,
  GoogleMark,
} from '../../src/components/onboarding/visuals';
import { registerWithEmail, signIn } from '../../src/lib/auth-client';
import { splitFullName } from '../../src/lib/name';
import { useOnboarding } from '../../src/lib/onboarding';
import { colors } from '../../src/theme/tokens';
import { fonts } from '../../src/theme/typography';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboarding = useOnboarding();
  const toast = useToast();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = React.useState<AuthMode>(
    params.mode === 'register' ? 'register' : 'login',
  );
  const isRegister = mode === 'register';

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [agb, setAgb] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // In register mode the CTA + social stay locked until AGB is accepted.
  const locked = isRegister && !agb;

  const onSubmit = React.useCallback(async () => {
    if (locked) {
      toast.show('Bitte AGB & Datenschutz akzeptieren');
      return;
    }
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    if (isRegister && password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        const full = name.trim() || email.trim().split('@')[0]!;
        const { firstName, lastName } = splitFullName(full);
        const res = await registerWithEmail({
          email: email.trim(),
          password,
          name: full,
          firstName,
          lastName,
        });
        if (res.error) {
          setError(res.error.message ?? 'Registrierung fehlgeschlagen.');
          return;
        }
        // Enter the register sub-flow before the gate can route us to the app.
        onboarding.beginRegistration(firstName, lastName);
        router.push('/onboarding/profile');
      } else {
        const res = await signIn.email({ email: email.trim(), password });
        if (res.error) {
          setError(res.error.message ?? 'Anmeldung fehlgeschlagen.');
          return;
        }
        // Success: the gate observes the session and routes into the app.
      }
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  }, [locked, email, password, isRegister, name, onboarding, router, toast]);

  const onSocial = React.useCallback(
    (provider: 'Apple' | 'Google') => {
      if (locked) {
        toast.show('Bitte AGB & Datenschutz akzeptieren');
        return;
      }
      // STUB: real brand marks, but no OAuth yet.
      toast.show(`${provider}-Login · bald verfügbar`);
    },
    [locked, toast],
  );

  return (
    <View style={styles.root}>
      <BlurredPipeline />

      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.replace('/onboarding/welcome')}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          style={styles.back}
          testID="auth-back"
        >
          <BackIcon size={17} color="#23211d" />
        </Pressable>
      </View>

      <View style={{ flex: 1 }} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + 30 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.grabber} />

          <Segmented<AuthMode>
            options={[
              { key: 'login', label: 'Anmelden' },
              { key: 'register', label: 'Registrieren' },
            ]}
            value={mode}
            onChange={setMode}
            testIDPrefix="auth-segment"
          />

          <View style={styles.fields}>
            {isRegister && (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.faint}
                autoCapitalize="words"
                style={styles.input}
                testID="auth-name"
              />
            )}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-Mail"
              placeholderTextColor={colors.faint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              testID="auth-email"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Passwort"
              placeholderTextColor={colors.faint}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              testID="auth-password"
            />
          </View>

          {isRegister && (
            <Checkbox
              checked={agb}
              onToggle={() => setAgb((v) => !v)}
              checkedColor="#23211d"
              align="flex-start"
              testID="auth-agb"
            >
              <Text style={styles.agbText}>
                Ich akzeptiere die <Text style={styles.agbLink}>AGB</Text> und die{' '}
                <Text style={styles.agbLink}>Datenschutzerklärung</Text>.
              </Text>
            </Checkbox>
          )}

          {error != null && (
            <Text style={styles.error} testID="auth-error">
              {error}
            </Text>
          )}

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            accessibilityRole="button"
            style={[styles.cta, locked && styles.ctaLocked]}
            testID="auth-submit"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {isRegister ? 'Konto erstellen' : 'Anmelden'}
              </Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerLabel}>SCHNELL</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              onPress={() => onSocial('Apple')}
              accessibilityRole="button"
              style={[styles.social, locked && styles.socialLocked]}
              testID="auth-apple"
            >
              <AppleMark size={16} color={locked ? '#bdbab3' : '#23211d'} />
              <Text style={[styles.socialText, locked && styles.socialTextLocked]}>
                Apple
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSocial('Google')}
              accessibilityRole="button"
              style={[styles.social, locked && styles.socialLocked]}
              testID="auth-google"
            >
              <GoogleMark size={16} />
              <Text style={[styles.socialText, locked && styles.socialTextLocked]}>
                Google
              </Text>
            </Pressable>
          </View>
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
  sheet: {
    flexGrow: 0,
    backgroundColor: '#f7f5f2',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -22 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 20,
  },
  sheetContent: { paddingHorizontal: 28, paddingTop: 16 },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#dcd8d1',
    alignSelf: 'center',
    marginBottom: 22,
  },
  fields: { marginTop: 20, gap: 12 },
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
  agbText: {
    flex: 1,
    fontFamily: fonts.hanken400,
    fontSize: 12.5,
    color: '#6b6862',
    lineHeight: 18,
    marginTop: 16,
  },
  agbLink: { color: colors.tealText, textDecorationLine: 'underline' },
  error: {
    fontFamily: fonts.hanken500,
    fontSize: 12.5,
    color: colors.red,
    marginTop: 14,
  },
  cta: {
    width: '100%',
    backgroundColor: '#23211d',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  ctaLocked: { backgroundColor: '#bdbab3' },
  ctaText: { fontFamily: fonts.hanken600, fontSize: 15, color: '#fff' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  divider: { flex: 1, height: 1, backgroundColor: '#e0dcd5' },
  dividerLabel: {
    fontFamily: fonts.mono500,
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#a7a29a',
  },
  socialRow: { flexDirection: 'row', gap: 10 },
  social: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dcd8d1',
    borderRadius: 12,
    paddingVertical: 13,
  },
  socialLocked: { opacity: 0.6 },
  socialText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#23211d' },
  socialTextLocked: { color: '#bdbab3' },
});
