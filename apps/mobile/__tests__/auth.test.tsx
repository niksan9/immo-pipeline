/**
 * Auth flow tests (mocked auth client + router):
 *  - the gate redirects unauthenticated users to /(auth)/sign-in and signed-in
 *    users off the auth screens into the app,
 *  - a successful sign-in calls the better-auth client (its success then flips
 *    the session, which the gate routes into the app),
 *  - profile sign-out clears the session but never the local (offline) data.
 */
import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Router mock (mutable segments so the gate can be steered per test) ------
let mockSegments: string[] = [];
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useSegments: () => mockSegments,
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: mockBack }),
}));

// --- Auth client mock --------------------------------------------------------
const mockSignInEmail = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue(undefined);
let mockSession: { user: { email: string; name: string } } | null = null;
jest.mock('../src/lib/auth-client', () => ({
  API_BASE_URL: 'http://localhost:3000',
  getSessionCookie: () => '',
  useSession: () => ({ data: mockSession, isPending: false }),
  signIn: { email: (...args: unknown[]) => mockSignInEmail(...args) },
  signUp: { email: jest.fn() },
  signOut: () => mockSignOut(),
}));

import { AuthGate } from '../src/lib/AuthGate';
import SignInScreen from '../app/(auth)/sign-in';
import ProfileScreen from '../app/profile';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>
);

beforeEach(() => {
  mockSegments = [];
  mockReplace.mockClear();
  mockBack.mockClear();
  mockSignInEmail.mockReset();
  mockSignOut.mockClear();
  mockSession = null;
});

describe('AuthGate', () => {
  it('redirects an unauthenticated user to the sign-in screen', () => {
    mockSegments = ['index']; // in the app, not the (auth) group
    render(<AuthGate authed={false} />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('sends a signed-in user off the auth screens into the app', () => {
    mockSegments = ['(auth)', 'sign-in'];
    render(<AuthGate authed />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not redirect a signed-in user already in the app', () => {
    mockSegments = ['index'];
    render(<AuthGate authed />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('sign-in screen', () => {
  it('calls the auth client with the entered credentials on submit', async () => {
    mockSignInEmail.mockResolvedValue({ error: null });
    render(wrap(<SignInScreen />));

    fireEvent.changeText(screen.getByTestId('auth-email'), 'a@b.de');
    fireEvent.changeText(screen.getByTestId('auth-password'), 'sup3rsecret!');
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: 'a@b.de',
        password: 'sup3rsecret!',
      }),
    );
  });

  it('surfaces the auth error message on failure', async () => {
    mockSignInEmail.mockResolvedValue({
      error: { message: 'Invalid email or password' },
    });
    render(wrap(<SignInScreen />));

    fireEvent.changeText(screen.getByTestId('auth-email'), 'a@b.de');
    fireEvent.changeText(screen.getByTestId('auth-password'), 'wrongpass');
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('auth-error')).toHaveTextContent(
        'Invalid email or password',
      ),
    );
  });
});

describe('profile sign-out', () => {
  it('clears the session but leaves local data intact', async () => {
    mockSession = { user: { email: 'me@dealpilot.de', name: 'Me' } };
    const removeSpy = jest.spyOn(AsyncStorage, 'removeItem');
    const clearSpy = jest.spyOn(AsyncStorage, 'clear');

    render(wrap(<ProfileScreen />));
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'me@dealpilot.de',
    );

    fireEvent.press(screen.getByTestId('profile-sign-out'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    // Sign-out must NOT wipe the on-device store.
    expect(removeSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
