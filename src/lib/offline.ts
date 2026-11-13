/** What a button reports when its request never reached the server. */
export const OFFLINE_MESSAGE = "No connection. Try again when online.";

/** Use as `.catch(offline)` on a Server Action call, so a dropped connection shows a message instead of the error page. */
export function offline() {
  return { ok: false as const, message: OFFLINE_MESSAGE };
}
