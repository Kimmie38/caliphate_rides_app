import { ENV } from "../config/env";
import type { User } from "../types";
import { api, ApiError, wait } from "./http";
import { mockUser } from "./mockData";
import { t } from "../i18n";

// Backend contract
// POST /auth/otp/request  { phone }          -> { expiresIn, delivery, code? }  ("app": the app shows code as a notification)
// POST /auth/otp/verify   { phone, code }    -> { token, user, isNewUser }
// GET  /me                                    -> { user }
// PATCH /me               { name?, email?, language? }  -> { user }

/**
 * How the code reaches the person: "app" (we show it as a notification; the code is in the reply),
 * "sms", "support" (the number has an account on another phone: support reads them the code after
 * calling the number), or "log" (testing: the code is in the server log).
 */
export type CodeDelivery = "app" | "sms" | "support" | "log";
export type OtpRequest = { expiresIn: number; delivery: CodeDelivery; code?: string };

export async function requestOtp(phone: string): Promise<OtpRequest> {
  if (ENV.useMock) { await wait(600); return { expiresIn: 300, delivery: "app", code: String(Math.floor(100000 + Math.random() * 900000)) }; }
  const r = await api<Partial<OtpRequest>>("/auth/otp/request", { method: "POST", body: { phone } });
  // An older server answers { expiresIn } only: that's SMS (or the log).
  return { expiresIn: r.expiresIn ?? 300, delivery: r.delivery ?? "sms", code: r.code };
}

export async function verifyOtp(phone: string, code: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
  if (ENV.useMock) {
    await wait(700);
    if (!/^\d{6}$/.test(code)) throw new ApiError(t("Enter the 6-digit code from the SMS."), 400, "invalid_code");
    return { token: "mock-token", user: mockUser(phone), isNewUser: true };
  }
  return api("/auth/otp/verify", { method: "POST", body: { phone, code } });
}

/** Deletes the account for good (DELETE /me). Throws the server's reason if a trip or money needs settling first. */
export async function deleteAccount(): Promise<void> {
  if (ENV.useMock) { await wait(700); return; }
  await api("/me", { method: "DELETE" });
}

export async function getMe(): Promise<User> {
  const r = await api<{ user: User }>("/me");
  return r.user;
}

export async function updateProfile(patch: { name?: string; email?: string; language?: "en" | "ha" }, current: User): Promise<User> {
  if (ENV.useMock) { await wait(400); return { ...current, ...patch }; }
  const r = await api<{ user: User }>("/me", { method: "PATCH", body: patch });
  return r.user;
}
