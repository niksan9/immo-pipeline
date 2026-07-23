/**
 * Pure name helpers. Kept free of the better-auth client's construction side
 * effects so screens and tests can import them directly.
 */

/**
 * Split a full "Vor- und Nachname" string into first / last name. The first
 * whitespace-delimited token is the first name; everything after it is the last
 * name (so "Anna Maria Berg" → first "Anna", last "Maria Berg"). A single token
 * yields an empty last name. Used to seed the Profil step from the Auth screen's
 * single Name field; the Profil step is authoritative and can override both.
 */
export function splitFullName(full: string): {
  firstName: string;
  lastName: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = parts;
  return { firstName: firstName!, lastName: rest.join(' ') };
}

/** First name for the greeting: prefers `firstName`, falls back to `name`. */
export function firstNameOf(
  user: { firstName?: string | null; name?: string | null } | null | undefined,
): string {
  if (!user) return '';
  if (user.firstName) return user.firstName;
  return (user.name ?? '').trim().split(/\s+/)[0] ?? '';
}
