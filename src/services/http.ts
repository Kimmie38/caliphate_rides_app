import { ENV } from "../config/env";
import { t } from "../i18n";
import { deviceId, deviceName } from "../lib/device";

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => { authToken = t; };
export const getAuthToken = () => authToken;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal };

/** How long to wait for the server before giving up (slow mobile data shouldn't freeze the app). */
const TIMEOUT_MS = 20_000;

/** JSON request to the Caliphate Rides backend. Throws ApiError with the server's message. */
export async function api<T>(path: string, { method = "GET", body, signal, timeoutMs = TIMEOUT_MS }: Options & { timeoutMs?: number } = {}): Promise<T> {
  let res: Response;
  const device = await deviceId();
  // Gives up after timeoutMs, and still honours the caller's own cancel signal.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.("abort", onAbort);
  try {
    res = await fetch(`${ENV.apiUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(device ? { "X-Device-Id": device } : {}),
        ...(deviceName() ? { "X-Device-Name": deviceName() } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e: any) {
    if (__DEV__) console.warn(`[network] ${method} ${ENV.apiUrl}${path} failed:`, timedOut ? "timed out" : e?.message ?? e);
    if (timedOut) throw new ApiError(t("Caliphate Rides is taking too long to answer. Check your internet connection and try again."), 0, "timeout");
    if (signal?.aborted) throw e; // the caller cancelled it
    throw new ApiError(t("Can't reach Caliphate Rides. Check your internet connection and try again."), 0, "network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.("abort", onAbort);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new ApiError(data?.message ?? t("Request failed ({0})", res.status), res.status, data?.code);
  return data as T;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** An error whose message is written for people (shown as is). Anything else gets a friendly fallback. */
export class UserMessage extends Error {}

/**
 * The text to show for an error: the server's message, or one of ours, or the fallback. Never a raw
 * programming error ("undefined is not a function" and the like); those only go to the test log.
 */
export function errorText(e: unknown, fallback: string): string {
  if ((e instanceof ApiError || e instanceof UserMessage) && e.message) return e.message;
  if (__DEV__) console.warn("[error shown as fallback]", e);
  return fallback;
}
