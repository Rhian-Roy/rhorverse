// TV mode = big-screen, remote-driven UI with spatial navigation.
const TV_UA = /\b(SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|HbbTV|VIDAA|AFT[A-Z]|Android TV|GoogleTV|CrKey|BRAVIA)\b/i;

export function isTvUserAgent(ua: string | null | undefined): boolean {
  return !!ua && TV_UA.test(ua);
}

/** Browser only. `?tv=1` forces TV mode (and `?tv=0` disables it) for testing. */
export function isTv(): boolean {
  if (typeof window === "undefined") return false;
  const forced = new URLSearchParams(window.location.search).get("tv");
  if (forced === "1") return true;
  if (forced === "0") return false;
  return isTvUserAgent(window.navigator.userAgent);
}
