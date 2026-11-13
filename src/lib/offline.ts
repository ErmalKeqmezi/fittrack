import { unstable_rethrow } from "next/navigation";

/** What a button reports when its request never reached the server. */
export const OFFLINE_MESSAGE = "No connection. Try again when online.";

/**
 * Use as `.catch(offline)` on a Server Action call, so a dropped connection
 * shows a message instead of the error page. An action that ends by opening
 * another page also "throws"; that is passed on untouched.
 */
export function offline(error: unknown) {
  unstable_rethrow(error);
  return { ok: false as const, message: OFFLINE_MESSAGE };
}
