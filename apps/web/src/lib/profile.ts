// Anonymous local profile: a UUID kept in a first-party cookie, sent with events.
export const PROFILE_COOKIE = "rhorverse_pid";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

export function readProfileId(cookieHeader: string | undefined | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${PROFILE_COOKIE}=([0-9a-f-]{36})`));
  return match?.[1] ?? null;
}

/** Browser only: returns the existing profile id, creating one if needed. */
export function ensureProfileId(): string {
  const existing = readProfileId(document.cookie);
  if (existing) return existing;
  const id = crypto.randomUUID();
  document.cookie = `${PROFILE_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_S}; SameSite=Lax`;
  return id;
}
