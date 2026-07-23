/**
 * Consent recording (AGB + KI-Hinweis).
 *
 * Consent is authoritative SERVER-SIDE: after a successful register plus the
 * KI-Hinweis "Verstanden" step we POST both blocks to `/api/consent` (the API
 * agent builds this endpoint in parallel). We also stamp a local record so a
 * relaunch can tell that this user has already consented without a round-trip.
 *
 * TODO(legal): AGB_VERSION / AI_NOTICE_VERSION are placeholders until the final
 * legal text ships with the AGB. Bump them (and re-prompt) when the text lands.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, getSessionCookie } from './auth-client';

/** Version of the AGB / Datenschutz text the user accepted. */
export const AGB_VERSION = '2026-07-draft';
/** Version of the KI-Hinweis text the user acknowledged. */
export const AI_NOTICE_VERSION = '2026-07-draft';

export interface ConsentPayload {
  agb: { accepted: boolean; version: string };
  aiNotice: { accepted: boolean; version: string };
}

/** The payload we send/store for a fully-accepted onboarding. */
export function acceptedConsent(): ConsentPayload {
  return {
    agb: { accepted: true, version: AGB_VERSION },
    aiNotice: { accepted: true, version: AI_NOTICE_VERSION },
  };
}

const consentKey = (userId: string) => `dealpilot_consent_${userId}`;

/**
 * Record consent both on the server (POST /api/consent) and locally. Throws if
 * the server call fails so the caller can keep the user in the KI-Hinweis step
 * and retry rather than dropping them into the app with no server-side record.
 */
export async function recordConsent(userId: string | null): Promise<void> {
  const payload = acceptedConsent();
  const res = await fetch(`${API_BASE_URL}/api/consent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Same cookie-forwarding the sync engine uses for authed API calls.
      Cookie: getSessionCookie(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Consent POST failed with ${res.status}`);
  }
  if (userId) {
    await AsyncStorage.setItem(
      consentKey(userId),
      JSON.stringify({ ...payload, at: Date.now() }),
    );
  }
}

/** True if a local consent record exists for this user (best-effort). */
export async function hasLocalConsent(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(consentKey(userId))) != null;
  } catch {
    return false;
  }
}

/**
 * Fetch the current server-side consent state (GET /api/consent). Provided for
 * a future launch-time re-check; the register sub-flow itself is driven by the
 * session-scoped pending flag, so this is not on the critical path yet.
 */
export async function fetchConsent(): Promise<ConsentPayload | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/consent`, {
      headers: { Cookie: getSessionCookie() },
    });
    if (!res.ok) return null;
    return (await res.json()) as ConsentPayload;
  } catch {
    return null;
  }
}
