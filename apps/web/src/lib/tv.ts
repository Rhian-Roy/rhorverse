// TV mode = big-screen, remote-driven UI with spatial navigation.
const TV_UA = /\b(SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|HbbTV|VIDAA|AFT[A-Z]|Android TV|GoogleTV|CrKey|BRAVIA)\b/i;

export const TV_KEY = "rhorverse_tv";

export function isTvUserAgent(ua: string | null | undefined): boolean {
  return !!ua && TV_UA.test(ua);
}

/** Browser only. `?tv=1` / `?tv=0` force it, then the Profile toggle, then the user agent. */
export function isTv(): boolean {
  if (typeof window === "undefined") return false;
  const forced = new URLSearchParams(window.location.search).get("tv");
  if (forced === "1") return true;
  if (forced === "0") return false;
  try {
    const saved = window.localStorage.getItem(TV_KEY);
    if (saved === "on") return true;
    if (saved === "off") return false;
  } catch {
    // Storage blocked: fall through to the user agent.
  }
  return isTvUserAgent(window.navigator.userAgent);
}
