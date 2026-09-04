/**
 * "Remember me" support.
 *
 * Sessions are always stored so refreshes keep you signed in. When the user
 * opts OUT of being remembered we record that choice and tag the current browser
 * session (sessionStorage). On the next full browser launch the tag is gone, so
 * the stored session is signed out instead of restored.
 */
const MODE_KEY = "plugzone-remember";
const TAB_KEY = "plugzone-browser-session";
const ID_KEY = "plugzone-remembered-id";
const CHANNEL = "plugzone-session";

const hasWindow = () => typeof window !== "undefined";

export function setRememberMe(remember: boolean) {
  if (!hasWindow()) return;
  localStorage.setItem(MODE_KEY, remember ? "1" : "0");
  if (remember) sessionStorage.removeItem(TAB_KEY);
  else sessionStorage.setItem(TAB_KEY, "1");
}

/** Persist the sign-in identifier when "Remember me" is ticked; wipe it when not. */
export function setRememberedIdentifier(identifier: string | null) {
  if (!hasWindow()) return;
  if (identifier) localStorage.setItem(ID_KEY, identifier);
  else localStorage.removeItem(ID_KEY);
}

export function getRememberedIdentifier(): string {
  if (!hasWindow()) return "";
  return localStorage.getItem(ID_KEY) ?? "";
}

export function clearSessionMode() {
  if (!hasWindow()) return;
  // Keep the remembered identifier across sign-out so the field stays prefilled.
  localStorage.removeItem(MODE_KEY);
  sessionStorage.removeItem(TAB_KEY);
}

/** Other open tabs answer pings so a new tab in the same browser is not treated as a restart. */
export function answerSessionPings() {
  if (!hasWindow() || typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = (e) => {
    if (e.data === "ping" && sessionStorage.getItem(TAB_KEY)) ch.postMessage("pong");
  };
  return () => ch.close();
}

async function anotherTabIsOpen(): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return false;
  return new Promise((resolve) => {
    const ch = new BroadcastChannel(CHANNEL);
    const done = (v: boolean) => {
      clearTimeout(timer);
      ch.close();
      resolve(v);
    };
    ch.onmessage = (e) => e.data === "pong" && done(true);
    ch.postMessage("ping");
    const timer = setTimeout(() => done(false), 250);
  });
}

/** True only when the user unticked "Remember me" and this is a fresh browser launch. */
export async function shouldDropStoredSession(): Promise<boolean> {
  if (!hasWindow()) return false;
  if (localStorage.getItem(MODE_KEY) !== "0") return false;
  if (sessionStorage.getItem(TAB_KEY)) return false;
  if (await anotherTabIsOpen()) {
    sessionStorage.setItem(TAB_KEY, "1");
    return false;
  }
  return true;
}
