import { t } from "../i18n";
import { ApiError } from "../services/http";

/**
 * The server's PIN messages, in the app's language (the server writes them in English). Keeps the
 * numbers it gives: tries left, minutes to wait.
 */
export function pinMessage(e: any, fallback: string): string {
  const message = typeof e?.message === "string" ? e.message : "";
  if (e?.code === "wrong_pin") {
    const left = message.match(/(\d+) tr(?:y|ies) left/);
    if (left) return left[1] === "1" ? t("Wrong PIN. 1 try left before a 30-minute pause.") : t("Wrong PIN. {0} tries left before a 30-minute pause.", left[1]);
  }
  if (e?.code === "pin_paused") {
    const mins = message.match(/in (\d+) minute/);
    return t("Too many wrong PINs. Try again in {0} minutes, or tap Forgot PIN.", mins?.[1] ?? "30");
  }
  // Only the server's own messages are shown; anything else (a network or app error) gets the fallback.
  return e instanceof ApiError && message ? t(message) : fallback;
}
