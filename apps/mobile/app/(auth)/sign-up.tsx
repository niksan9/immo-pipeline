import * as React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthForm, type AuthFormValues } from '../../src/components/auth/AuthForm';
import { signUp } from '../../src/lib/auth-client';

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = React.useCallback(
    async ({ name, email, password }: AuthFormValues) => {
      if (!email || !password) {
        setError('Bitte E-Mail und Passwort eingeben.');
        return;
      }
      if (password.length < 8) {
        setError('Das Passwort muss mindestens 8 Zeichen haben.');
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const res = await signUp.email({
          email,
          password,
          // better-auth requires a name; fall back to the local part of the email.
          name: name || email.split('@')[0]!,
        });
        if (res.error) {
          setError(res.error.message ?? 'Registrierung fehlgeschlagen.');
          return;
        }
        // Success: the root auth gate observes the new session and routes in.
      } catch {
        setError('Netzwerkfehler. Bitte erneut versuchen.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthForm
        mode="sign-up"
        loading={loading}
        error={error}
        onSubmit={onSubmit}
        onSwitch={() => router.replace('/(auth)/sign-in')}
      />
    </KeyboardAvoidingView>
  );
}
