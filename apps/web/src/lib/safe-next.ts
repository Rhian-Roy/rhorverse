/** A post-sign-in destination from a query string. Only same-site paths are allowed (no open redirect). */
export function safeNext(raw: string | string[] | null | undefined, fallback = "/"): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  return value;
}
