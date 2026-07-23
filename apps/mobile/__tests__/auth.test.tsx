/**
 * Onboarding / auth flow tests (mocked auth client, router, fetch):
 *  - the gate routes unauthenticated users into onboarding, keeps a
 *    freshly-registered (pending) user in the register sub-flow, and sends a
 *    fully-authenticated user into the app,
 *  - Welcome routes to the auth screen in register / login mode,
 *  - the AGB checkbox gates the CTA + social buttons until accepted (+ toast),
 *  - register success derives first/last name and advances to Profil, Profil
 *    persists the name and advances to the KI-Hinweis,
 *  - the KI-Hinweis mandatory checkbox gates the CTA, and completing it POSTs
 *    consent (both blocks + versions) and lands in the app,
 *  - login skips the sub-flow; social buttons are stubs that toast,
 *  - profile sign-out clears the session but never the local (offline) data.
 */
import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Router mock (mutable segments + params so screens/gate can be steered) ---
let mockSegments: string[] = [];
let mockParams: Record<string, string> = {};
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useSegments: () => mockSegments,
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
}));

// --- Auth client mock (network-touching pieces only; ./name stays real) ------
const mockSignInEmail = jest.fn();
const mockRegister = jest.fn();
const mockUpdateProfile = jest.fn().mockResolvedValue({ error: null });
const mockSignOut = jest.fn().mockResolvedValue(undefined);
let mockSession: { user: { id: string; email: string; name: string } } | null =
  null;
jest.mock('../src/lib/auth-client', () => ({
  API_BASE_URL: 'http://localhost:3000',
  getSessionCookie: () => 'dealpilot.session=abc',
  useSession: () => ({ data: mockSession, isPending: false }),
  signIn: { email: (...args: unknown[]) => mockSignInEmail(...args) },
  signUp: { email: jest.fn() },
  signOut: () => mockSignOut(),
  registerWithEmail: (...args: unknown[]) => mockRegister(...args),
  updateProfileName: (...args: unknown[]) => mockUpdateProfile(...args),
}));

import { AuthGate } from '../src/lib/AuthGate';
import { OnboardingProvider } from '../src/lib/onboarding';
import { splitFullName, firstNameOf } from '../src/lib/name';
import { AGB_VERSION, AI_NOTICE_VERSION } from '../src/lib/consent';
import WelcomeScreen from '../app/onboarding/welcome';
import AuthScreen from '../app/onboarding/auth';
import OnboardingProfileScreen from '../app/onboarding/profile';
import AiNoticeScreen from '../app/onboarding/ai-notice';
import ProfileScreen from '../app/profile';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>
);
const wrapOnboarding = (node: React.ReactNode, authed = false) => (
  <SafeAreaProvider initialMetrics={initialMetrics}>
    <OnboardingProvider authed={authed}>{node}</OnboardingProvider>
  </SafeAreaProvider>
);

beforeEach(() => {
  mockSegments = [];
  mockParams = {};
  mockReplace.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  mockSignInEmail.mockReset();
  mockRegister.mockReset();
  mockUpdateProfile.mockClear();
  mockSignOut.mockClear();
  mockSession = null;
});

describe('name helpers (greeting)', () => {
  it('splits a full name into first / last', () => {
    expect(splitFullName('Niklas Bergmann')).toEqual({
      firstName: 'Niklas',
      lastName: 'Bergmann',
    });
    expect(splitFullName('Anna Maria Berg')).toEqual({
      firstName: 'Anna',
      lastName: 'Maria Berg',
    });
    expect(splitFullName('Madonna')).toEqual({
      firstName: 'Madonna',
      lastName: '',
    });
  });

  it('derives the greeting first name, preferring firstName', () => {
    expect(firstNameOf({ firstName: 'Niklas', name: 'N. B.' })).toBe('Niklas');
    expect(firstNameOf({ name: 'Niklas Bergmann' })).toBe('Niklas');
    expect(firstNameOf(null)).toBe('');
  });
});

describe('AuthGate', () => {
  it('sends an unauthenticated user in the app to the welcome screen', () => {
    mockSegments = ['index'];
    render(<AuthGate authed={false} pending={false} />);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
  });

  it('does not redirect an unauthenticated user already in onboarding', () => {
    mockSegments = ['onboarding', 'welcome'];
    render(<AuthGate authed={false} pending={false} />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends a fully-authenticated user off an onboarding screen into the app', () => {
    mockSegments = ['onboarding', 'auth'];
    render(<AuthGate authed pending={false} />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not redirect a fully-authenticated user already in the app', () => {
    mockSegments = ['index'];
    render(<AuthGate authed pending={false} />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('pulls a pending (just-registered) user in the app back into the sub-flow', () => {
    mockSegments = ['index'];
    render(<AuthGate authed pending />);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/profile');
  });

  it('leaves a pending user alone while inside the register sub-flow', () => {
    mockSegments = ['onboarding', 'ai-notice'];
    render(<AuthGate authed pending />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('welcome screen', () => {
  it('routes "Loslegen" to the auth screen in register mode', () => {
    render(wrap(<WelcomeScreen />));
    fireEvent.press(screen.getByTestId('welcome-register'));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/auth?mode=register');
  });

  it('routes "Ich habe schon ein Konto" to the auth screen in login mode', () => {
    render(wrap(<WelcomeScreen />));
    fireEvent.press(screen.getByTestId('welcome-login'));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/auth?mode=login');
  });
});

describe('auth screen · register AGB gate', () => {
  beforeEach(() => {
    mockParams = { mode: 'register' };
  });

  it('blocks the CTA with a toast until AGB is accepted', async () => {
    render(wrapOnboarding(<AuthScreen />));
    fireEvent.changeText(screen.getByTestId('auth-email'), 'a@b.de');
    fireEvent.changeText(screen.getByTestId('auth-password'), 'sup3rsecret!');

    fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() =>
      expect(
        screen.getByText('Bitte AGB & Datenschutz akzeptieren'),
      ).toBeTruthy(),
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('blocks the social buttons with a toast until AGB is accepted', async () => {
    render(wrapOnboarding(<AuthScreen />));
    fireEvent.press(screen.getByTestId('auth-apple'));
    await waitFor(() =>
      expect(
        screen.getByText('Bitte AGB & Datenschutz akzeptieren'),
      ).toBeTruthy(),
    );
  });

  it('registers once AGB is checked, deriving first/last name and advancing to Profil', async () => {
    mockRegister.mockResolvedValue({ error: null });
    render(wrapOnboarding(<AuthScreen />));

    fireEvent.changeText(screen.getByTestId('auth-name'), 'Anna Berg');
    fireEvent.changeText(screen.getByTestId('auth-email'), 'anna@b.de');
    fireEvent.changeText(screen.getByTestId('auth-password'), 'sup3rsecret!');
    fireEvent.press(screen.getByTestId('auth-agb'));
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'anna@b.de',
        password: 'sup3rsecret!',
        name: 'Anna Berg',
        firstName: 'Anna',
        lastName: 'Berg',
      }),
    );
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/onboarding/profile'),
    );
  });
});

describe('auth screen · login', () => {
  beforeEach(() => {
    mockParams = { mode: 'login' };
  });

  it('signs in with the entered credentials and never enters the sub-flow', async () => {
    mockSignInEmail.mockResolvedValue({ error: null });
    render(wrapOnboarding(<AuthScreen />));

    fireEvent.changeText(screen.getByTestId('auth-email'), 'me@b.de');
    fireEvent.changeText(screen.getByTestId('auth-password'), 'sup3rsecret!');
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: 'me@b.de',
        password: 'sup3rsecret!',
      }),
    );
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith('/onboarding/profile');
    // No AGB field in login mode.
    expect(screen.queryByTestId('auth-agb')).toBeNull();
  });

  it('shows a stub toast for the social buttons', async () => {
    render(wrapOnboarding(<AuthScreen />));
    fireEvent.press(screen.getByTestId('auth-google'));
    await waitFor(() =>
      expect(screen.getByText('Google-Login · bald verfügbar')).toBeTruthy(),
    );
    expect(mockSignInEmail).not.toHaveBeenCalled();
  });
});

describe('onboarding profile step', () => {
  it('persists the entered name and advances to the KI-Hinweis', async () => {
    render(wrapOnboarding(<OnboardingProfileScreen />));

    fireEvent.changeText(screen.getByTestId('profile-first'), 'Niklas');
    fireEvent.changeText(screen.getByTestId('profile-last'), 'Bergmann');
    fireEvent.press(screen.getByTestId('profile-next'));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith('Niklas', 'Bergmann'),
    );
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/onboarding/ai-notice'),
    );
  });
});

describe('onboarding KI-Hinweis step', () => {
  const okFetch = () =>
    jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

  beforeEach(() => {
    mockSession = { user: { id: 'u1', email: 'me@b.de', name: 'Niklas' } };
  });

  it('gates the CTA until the mandatory checkbox is ticked', async () => {
    const fetchMock = okFetch();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    render(wrapOnboarding(<AiNoticeScreen />, true));

    fireEvent.press(screen.getByTestId('ai-notice-finish'));
    await waitFor(() =>
      expect(
        screen.getByText('Bitte bestätigen, dass du das verstanden hast'),
      ).toBeTruthy(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records consent (both blocks + versions) and lands in the app', async () => {
    const fetchMock = okFetch();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    render(wrapOnboarding(<AiNoticeScreen />, true));

    fireEvent.press(screen.getByTestId('ai-notice-check'));
    fireEvent.press(screen.getByTestId('ai-notice-finish'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/consent');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      agb: { accepted: true, version: AGB_VERSION },
      aiNotice: { accepted: true, version: AI_NOTICE_VERSION },
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});

describe('profile sign-out', () => {
  it('clears the session but leaves local data intact', async () => {
    mockSession = { user: { id: 'u1', email: 'me@dealpilot.de', name: 'Me' } };
    const removeSpy = jest.spyOn(AsyncStorage, 'removeItem');
    const clearSpy = jest.spyOn(AsyncStorage, 'clear');

    render(wrap(<ProfileScreen />));
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'me@dealpilot.de',
    );

    fireEvent.press(screen.getByTestId('profile-sign-out'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(removeSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
