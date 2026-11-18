import { ENV } from "../config/env";
import { appAlert } from "../components/AppAlert";
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

const REQUEST_TIMEOUT_MS = 20_000;

async function requestWithRetry(url: string, method: string, signal: AbortSignal | undefined, init: RequestInit): Promise<{ response: Response; text: string }> {
  const safeToRetryAutomatically = method.toUpperCase() === "GET";
  let keepRetrying = false;
  let retryDelay = 1_000;

  while (true) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    if (signal?.aborted) controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    let failure: unknown;

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return { response, text: await response.text() };
    } catch (e) {
      if (signal?.aborted) throw e;
      failure = e;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    const code = timedOut ? "timeout" : "network";
    const message = timedOut
      ? t("Caliphate Rides is taking too long to answer. Check your internet connection and try again.")
      : t("Can't reach Caliphate Rides. Check your internet connection and try again.");
    if (__DEV__) console.warn(`[network] ${method} ${url} failed:`, timedOut ? "timed out" : failure);

    if (keepRetrying && safeToRetryAutomatically) {
      await wait(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
      continue;
    }

    const retry = await new Promise<boolean>((resolve) => {
      appAlert(
        t("Network connection problem"),
        safeToRetryAutomatically
          ? t("This request is taking longer than expected. Tap Retry to keep trying until the connection works.")
          : t("This request couldn't connect. Tap Retry to try it again. If the server received it, repeating it could create a duplicate."),
        [
          { text: t("Retry"), onPress: () => resolve(true) },
          { text: t("Cancel"), style: "cancel", onPress: () => resolve(false) },
        ],
        { tone: "amber", icon: "alert" },
      );
    });

    if (!retry) throw new ApiError(message, 0, code);
    if (safeToRetryAutomatically) keepRetrying = true;
  }
}

export function fetchWithRetry(url: string, init: RequestInit = {}) {
  return requestWithRetry(url, init.method ?? "GET", init.signal ?? undefined, init);
}

/** JSON request to the Caliphate Rides backend. Throws ApiError with the server's message. */
export async function api<T>(path: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
  const device = await deviceId();
  const { response: res, text } = await fetchWithRetry(`${ENV.apiUrl}${path}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(device ? { "X-Device-Id": device } : {}),
      ...(deviceName() ? { "X-Device-Name": deviceName() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
