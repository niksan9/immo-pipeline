/**
 * Auth gate: routes between the onboarding flow (`app/onboarding/*`) and the
 * authenticated app based on the session and the register sub-flow flag.
 * Rendered once, alongside the root navigator. Extracted from the layout so the
 * redirect logic is unit-testable without booting the whole Stack.
 *
 * Three states:
 *  1. NOT signed in → onboarding welcome (`/onboarding/welcome`).
 *  2. Signed in but `pending` (registered this session, consent not yet
 *     recorded) → the register sub-flow (Profil → KI-Hinweis). The screens push
 *     forward themselves; the gate only shepherds a pending user who somehow
 *     landed in the app back into the sub-flow.
 *  3. Signed in and not pending → the app. A user sitting on an onboarding
 *     screen (e.g. just after login) is sent in.
 *
 * This is also the mechanism behind the sync engine's 401 handling: when the
 * API rejects our session, the engine's `onUnauthorized` callback signs the
 * user out (see auth-client `handleExpiredSession`), which flips `authed` to
 * false here and redirects back to onboarding — no infinite retry loop.
 */
import * as React from 'react';
import { useRouter, useSegments } from 'expo-router';

export interface AuthGateProps {
  /** Whether there is a live session. */
  authed: boolean;
  /**
   * Registered this session and not yet through Profil → KI-Hinweis → consent.
   * Keeps a freshly-registered (already-authenticated) user in the sub-flow.
   */
  pending: boolean;
}

/** The two screens that make up the register sub-flow. */
const SUBFLOW = new Set(['profile', 'ai-notice']);

export function AuthGate({ authed, pending }: AuthGateProps) {
  const segments = useSegments();
  const router = useRouter();
  // Everything under `app/onboarding/*` is the onboarding flow.
  const inOnboarding = segments[0] === 'onboarding';
  const inSubflow = inOnboarding && SUBFLOW.has(segments[1] ?? '');

  React.useEffect(() => {
    if (!authed) {
      // Not signed in but looking at the app → send to the welcome screen.
      if (!inOnboarding) router.replace('/onboarding/welcome');
      return;
    }
    if (pending) {
      // Registered this session: must finish the sub-flow first. If they are in
      // the app (not in onboarding at all), pull them into Profil. While still
      // on welcome/auth the auth screen itself navigates forward — leave it.
      if (!inOnboarding) router.replace('/onboarding/profile');
      return;
    }
    // Fully authenticated → the app. Leave an onboarding screen behind.
    if (inOnboarding) router.replace('/');
  }, [authed, pending, inOnboarding, inSubflow, router]);

  return null;
}
