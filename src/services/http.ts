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

/** JSON request to the Caliphate Rides backend. Throws ApiError with the server's message. */
export async function api<T>(path: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
  let res: Response;
  const device = await deviceId();
  try {
    res = await fetch(`${ENV.apiUrl}${path}`, {
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
  } catch (e: any) {
    if (__DEV__) console.warn(`[network] ${method} ${ENV.apiUrl}${path} failed:`, e?.message ?? e);
    throw new ApiError(t("Can't reach Caliphate Rides. Check your internet connection and try again."), 0, "network");
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new ApiError(data?.message ?? t("Request failed ({0})", res.status), res.status, data?.code);
  return data as T;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
