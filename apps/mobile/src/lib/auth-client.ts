/**
 * better-auth Expo client (email + password).
 *
 * Follows the official better-auth Expo guide: `createAuthClient` from the
 * React entry, with the `expoClient` plugin wiring session persistence into
 * `expo-secure-store` (the plugin's default storage). The session cookie is
 * kept in SecureStore under the `dealpilot_*` prefix and survives app restarts.
 *
 * `getCookie()` returns the stored `Cookie` header value so our own authed API
 * calls (the sync engine → /api/deals) can attach it to plain `fetch`.
 *
 * The base URL comes from `EXPO_PUBLIC_API_URL` (inlined by Expo at build time),
 * defaulting to the local API at http://localhost:3000. It MUST be one of the
 * API's trustedOrigins-reachable hosts; the app scheme (`dealpilot`) is what the
 * plugin sends as `expo-origin`, which the API's expo() plugin trusts.
 */
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

/** API origin. `EXPO_PUBLIC_*` vars are statically inlined by the Expo bundler. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    expoClient({
      scheme: "dealpilot",
      storagePrefix: "dealpilot",
      // expo-secure-store exposes synchronous getItem/setItem (SDK 50+), which
      // is the shape the expo client's storage adapter expects.
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;

/**
 * The `Cookie` header value for the current session, or "" when signed out.
 * Used by the sync engine to authenticate its own requests to the deal API.
 */
export function getSessionCookie(): string {
  try {
    return authClient.getCookie() ?? "";
  } catch {
    return "";
  }
}

/**
 * Handle an expired / invalid session, wired to the sync engine's
 * `onUnauthorized` callback (fired on an HTTP 401 from the deal API). Signs the
 * user out so the {@link AuthGate} redirects to the sign-in screen instead of
 * the engine hammering the server with a doomed retry loop. Best-effort: even
 * if the sign-out network call fails, control returns without throwing.
 */
export async function handleExpiredSession(): Promise<void> {
  try {
    await signOut();
  } catch {
    // Best-effort: a failed sign-out request must not wedge the app; the local
    // session is dropped either way and the user lands back on sign-in.
  }
}
