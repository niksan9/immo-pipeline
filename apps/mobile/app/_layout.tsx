import * as React from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';

import { DealsProvider } from '../src/data/store';
import { colors } from '../src/theme/tokens';
import {
  API_BASE_URL,
  getSessionCookie,
  handleExpiredSession,
  useSession,
} from '../src/lib/auth-client';
import { AuthGate } from '../src/lib/AuthGate';
import { SyncStatusContext } from '../src/lib/syncStatus';
import { SyncController, type SyncStatus, type SyncStore } from '../src/lib/sync';
import {
  loadSnapshot,
  saveSnapshot,
  storageKeyForUser,
  type PersistedSnapshot,
} from '../src/data/persistence';

// Keep the splash screen up until fonts + session + hydration are ready.
void SplashScreen.preventAutoHideAsync();

const DEFAULT_STATUS: SyncStatus = {
  phase: 'idle',
  lastSyncAt: null,
  pending: 0,
};

/**
 * Load the persisted store snapshot for the signed-in user. `ready` is true once
 * loading finishes (or immediately when signed out — nothing to hydrate). Used
 * to hold the splash until on-device data is in hand.
 */
function useHydratedSnapshot(userId: string | null): {
  snapshot: PersistedSnapshot | null;
  ready: boolean;
} {
  const [state, setState] = React.useState<{
    userId: string | null;
    snapshot: PersistedSnapshot | null;
    ready: boolean;
  }>({ userId: null, snapshot: null, ready: userId == null });

  React.useEffect(() => {
    let cancelled = false;
    if (userId == null) {
      setState({ userId: null, snapshot: null, ready: true });
      return;
    }
    setState((s) =>
      s.userId === userId ? s : { userId, snapshot: null, ready: false },
    );
    void loadSnapshot(storageKeyForUser(userId)).then((snapshot) => {
      if (!cancelled) setState({ userId, snapshot, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { snapshot: state.snapshot, ready: state.ready };
}

/**
 * Wraps the app in the deal store and, when signed in, wires the offline-first
 * sync engine: persists slice changes to AsyncStorage (debounced), pushes local
 * mutations, and pulls on launch / foreground. Remounted per user via a `key`.
 */
function StoreShell({
  userId,
  snapshot,
  children,
}: {
  userId: string | null;
  snapshot: PersistedSnapshot | null;
  children: React.ReactNode;
}) {
  const [status, setStatus] = React.useState<SyncStatus>(DEFAULT_STATUS);
  const controllerRef = React.useRef<SyncController | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPersist = React.useCallback(
    (snap: PersistedSnapshot) => {
      if (!userId) return;
      // Debounce the actual write; the store fires this on every slice change.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveSnapshot(storageKeyForUser(userId), snap);
      }, 400);
    },
    [userId],
  );

  const bindSyncStore = React.useCallback(
    (store: SyncStore) => {
      if (!userId) return;
      controllerRef.current?.stop();
      const controller = new SyncController({
        baseURL: API_BASE_URL,
        store,
        getCookie: getSessionCookie,
        onStatus: setStatus,
        // On an expired session (HTTP 401) the engine halts and calls this;
        // signing out flips the AuthGate back to the sign-in screen.
        onUnauthorized: () => {
          void handleExpiredSession();
        },
      });
      controllerRef.current = controller;
      controller.start();
      void controller.fullSync();
    },
    [userId],
  );

  const onLocalChange = React.useCallback(() => {
    controllerRef.current?.notifyLocalChange();
  }, []);

  // Re-sync whenever the app returns to the foreground.
  React.useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void controllerRef.current?.fullSync();
    });
    return () => {
      sub.remove();
      controllerRef.current?.stop();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [userId]);

  return (
    <SyncStatusContext.Provider value={status}>
      <DealsProvider
        initialSnapshot={snapshot}
        onPersist={userId ? onPersist : undefined}
        bindSyncStore={userId ? bindSyncStore : undefined}
        onLocalChange={userId ? onLocalChange : undefined}
      >
        {children}
      </DealsProvider>
    </SyncStatusContext.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const authed = session?.user != null;
  const { snapshot, ready: hydrationReady } = useHydratedSnapshot(userId);

  // Splash stays up until fonts resolve, the session is known, and (when signed
  // in) the on-device store has been hydrated.
  const ready = fontsReady && !isPending && hydrationReady;

  const onLayout = React.useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    // Splash stays visible; render nothing until everything resolves.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <StoreShell
          key={userId ?? 'anon'}
          userId={userId}
          snapshot={authed ? snapshot : null}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bgApp },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="deal/[id]/index" />
            <Stack.Screen name="deal/[id]/risk/[riskId]" />
            <Stack.Screen name="(auth)/sign-in" />
            <Stack.Screen name="(auth)/sign-up" />
          </Stack>
          <AuthGate authed={authed} />
        </StoreShell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
