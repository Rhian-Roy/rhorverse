/**
 * A full page load, not a client-side navigation. Needed after signing in or out: the server has to
 * see the new session cookie, and /auth/callback is a route handler the Next router can't render.
 */
export function hardNavigate(path: string): void {
  window.location.assign(new URL(path, window.location.origin).href);
}
