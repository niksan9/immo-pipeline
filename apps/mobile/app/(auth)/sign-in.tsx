import * as React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthForm, type AuthFormValues } from '../../src/components/auth/AuthForm';
import { signIn } from '../../src/lib/auth-client';

export default function SignInScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = React.useCallback(
    async ({ email, password }: AuthFormValues) => {
      if (!email || !password) {
        setError('Bitte E-Mail und Passwort eingeben.');
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const res = await signIn.email({ email, password });
        if (res.error) {
          setError(res.error.message ?? 'Anmeldung fehlgeschlagen.');
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
        mode="sign-in"
        loading={loading}
        error={error}
        onSubmit={onSubmit}
        onSwitch={() => router.replace('/(auth)/sign-up')}
      />
    </KeyboardAvoidingView>
  );
}
