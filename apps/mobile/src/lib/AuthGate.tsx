/**
 * Auth gate: redirects between the authenticated app and the `(auth)` sign-in /
 * sign-up screens based on the current session. Rendered once, alongside the
 * root navigator. Extracted from the layout so the redirect logic is unit
 * testable without booting the whole Stack.
 *
 * This is also the mechanism behind the sync engine's 401 handling: when the
 * API rejects our session, the engine's `onUnauthorized` callback signs the
 * user out (see auth-client `handleExpiredSession`), which flips `authed` to
 * false here and redirects to sign-in — no infinite retry loop.
 */
import * as React from 'react';
import { useRouter, useSegments } from 'expo-router';

export interface AuthGateProps {
  /** Whether there is a live session. */
  authed: boolean;
}

export function AuthGate({ authed }: AuthGateProps) {
  const segments = useSegments();
  const router = useRouter();
  // The `(auth)` group holds sign-in / sign-up; everything else is the app.
  const inAuthGroup = segments[0] === '(auth)';

  React.useEffect(() => {
    if (!authed && !inAuthGroup) {
      // Not signed in but looking at the app → send to sign-in.
      router.replace('/(auth)/sign-in');
    } else if (authed && inAuthGroup) {
      // Signed in but sitting on an auth screen → send into the app.
      router.replace('/');
    }
  }, [authed, inAuthGroup, router]);

  return null;
}
