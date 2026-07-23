/**
 * Shared sign-in / sign-up form, styled with the DealPilot design tokens:
 * Bricolage title, Hanken labels & body, IBM Plex Mono uppercase field labels
 * and the dark primary button. Presentational only — the parent screen owns the
 * auth-client call, loading and error state.
 */
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';

export interface AuthFormValues {
  name: string;
  email: string;
  password: string;
}

export interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
  loading: boolean;
  error: string | null;
  onSubmit: (values: AuthFormValues) => void;
  /** Navigate to the other auth screen. */
  onSwitch: () => void;
}

const COPY = {
  'sign-in': {
    title: 'Willkommen zurück',
    subtitle: 'Melde dich an, um deine Pipeline zu öffnen.',
    submit: 'Anmelden',
    switchText: 'Noch kein Konto?',
    switchCta: 'Registrieren',
  },
  'sign-up': {
    title: 'Konto erstellen',
    subtitle: 'Lege ein Konto an, um Deals geräteübergreifend zu sichern.',
    submit: 'Registrieren',
    switchText: 'Bereits registriert?',
    switchCta: 'Anmelden',
  },
} as const;

export function AuthForm({
  mode,
  loading,
  error,
  onSubmit,
  onSwitch,
}: AuthFormProps) {
  const copy = COPY[mode];
  const isSignUp = mode === 'sign-up';
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const submit = () =>
    onSubmit({ name: name.trim(), email: email.trim(), password });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>DEALPILOT</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <Field
            label="NAME"
            value={name}
            onChangeText={setName}
            placeholder="Vor- und Nachname"
            autoCapitalize="words"
            testID="auth-name"
          />
        )}
        <Field
          label="E-MAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="name@beispiel.de"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          testID="auth-email"
        />
        <Field
          label="PASSWORT"
          value={password}
          onChangeText={setPassword}
          placeholder="Mindestens 8 Zeichen"
          secureTextEntry
          autoCapitalize="none"
          testID="auth-password"
        />

        {error != null && (
          <Text style={styles.error} testID="auth-error">
            {error}
          </Text>
        )}

        <Pressable
          onPress={submit}
          disabled={loading}
          accessibilityRole="button"
          style={[styles.submit, loading && styles.submitDisabled]}
          testID="auth-submit"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{copy.submit}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{copy.switchText} </Text>
        <Pressable
          onPress={onSwitch}
          accessibilityRole="button"
          testID="auth-switch"
        >
          <Text style={styles.switchCta}>{copy.switchCta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
}

function Field({ label, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[type.monoLabel, styles.fieldLabel]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faintAlt}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.bgApp,
  },
  header: { marginBottom: 28 },
  brand: {
    ...type.monoLabel,
    color: colors.teal,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 27,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.hanken400,
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    lineHeight: 20,
  },
  form: { gap: spacing.lg },
  field: { gap: 6 },
  fieldLabel: {},
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.button,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: fonts.hanken500,
    fontSize: 14.5,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.hanken500,
    fontSize: 12.5,
    color: colors.red,
  },
  submit: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: radii.button,
    backgroundColor: colors.dark,
    minHeight: 50,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    fontFamily: fonts.hanken600,
    fontSize: 15,
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    color: colors.muted,
  },
  switchCta: {
    fontFamily: fonts.hanken700,
    fontSize: 13.5,
    color: colors.tealText,
  },
});
