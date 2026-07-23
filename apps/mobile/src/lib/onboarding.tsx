/**
 * Onboarding / registration sub-flow state (auth + user + consent concern).
 *
 * Lives in its own root-level provider — NOT in the deal store — because the
 * onboarding UI (welcome / auth) runs BEFORE there is a session, whereas the
 * deal store is mounted per-user. Holds only session-scoped flags:
 *
 *  - `pending`: the user registered in THIS session and has not yet completed
 *    Profil → KI-Hinweis → consent. The {@link AuthGate} uses it to keep a
 *    freshly-registered (already-authenticated) user inside the register
 *    sub-flow instead of dropping them straight into the app. Login users never
 *    set it, so they skip the sub-flow. It is deliberately not persisted: a
 *    completed user who relaunches is authenticated + not pending → app.
 *  - `draftFirstName` / `draftLastName`: carried from the Auth screen's single
 *    Name field into the Profil step (which is authoritative and can override).
 *
 * `reset()` runs on sign-out (authed true → false) so a later re-login starts
 * clean.
 */
import * as React from 'react';

export interface OnboardingStore {
  /** Registered this session, register sub-flow not yet finished. */
  pending: boolean;
  draftFirstName: string;
  draftLastName: string;
  /** Called on register success: enters the sub-flow, seeds the draft name. */
  beginRegistration: (firstName: string, lastName: string) => void;
  /** Update the draft name (Profil step edits). */
  setDraftName: (firstName: string, lastName: string) => void;
  /** Called after consent is recorded: leaves the sub-flow. */
  completeOnboarding: () => void;
  /** Clear everything (sign-out). */
  reset: () => void;
}

const OnboardingContext = React.createContext<OnboardingStore | null>(null);

export interface OnboardingProviderProps {
  children: React.ReactNode;
  /** Live session flag, so the provider can reset on sign-out. */
  authed: boolean;
}

export function OnboardingProvider({ children, authed }: OnboardingProviderProps) {
  const [pending, setPending] = React.useState(false);
  const [draftFirstName, setDraftFirstName] = React.useState('');
  const [draftLastName, setDraftLastName] = React.useState('');

  const reset = React.useCallback(() => {
    setPending(false);
    setDraftFirstName('');
    setDraftLastName('');
  }, []);

  // Reset only on a true → false transition (sign-out / expired session), never
  // on the initial unauthenticated mount — that would race the moment right
  // after register success, where `authed` flips true and we set `pending`.
  const prevAuthed = React.useRef(authed);
  React.useEffect(() => {
    if (prevAuthed.current && !authed) reset();
    prevAuthed.current = authed;
  }, [authed, reset]);

  const value = React.useMemo<OnboardingStore>(
    () => ({
      pending,
      draftFirstName,
      draftLastName,
      beginRegistration: (firstName, lastName) => {
        setDraftFirstName(firstName);
        setDraftLastName(lastName);
        setPending(true);
      },
      setDraftName: (firstName, lastName) => {
        setDraftFirstName(firstName);
        setDraftLastName(lastName);
      },
      completeOnboarding: () => setPending(false),
      reset,
    }),
    [pending, draftFirstName, draftLastName, reset],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingStore {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an <OnboardingProvider>');
  }
  return ctx;
}
