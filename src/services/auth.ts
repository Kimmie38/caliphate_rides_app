import { ENV } from "../config/env";
import type { User } from "../types";
import { api, ApiError, wait } from "./http";
import { mockUser } from "./mockData";
import { t } from "../i18n";

// Backend contract
// POST /auth/otp/request  { phone, forgotPin? } -> { delivery: "pin", phoneName }  (has a PIN: ask for it)
//                                              or { expiresIn, delivery, code?, phoneName? } ("app": shown as a notification)
// POST /auth/otp/verify   { phone, code }    -> { token, user, isNewUser }
// POST /auth/pin/verify   { phone, pin }     -> { token, user, isNewUser: false }
// POST /me/pin            { pin, currentPin? } -> { user }
// GET  /me                                    -> { user }
// PATCH /me               { name?, email?, language? }  -> { user }

/**
 * How the code reaches the person: "app" (we show it as a notification; the code is in the reply),
 * "sms", "support" (the number has an account on another phone: support reads them the code after
 * calling the number), or "log" (testing: the code is in the server log).
 */
export type CodeDelivery = "app" | "sms" | "support" | "log" | "pin";
/** "pin": this number has an account with a PIN, so sign in with it (no code). phoneName: the phone it was last used on. */
export type OtpRequest = { expiresIn: number; delivery: CodeDelivery; code?: string; phoneName?: string };

// Sample mode: numbers that have made a PIN in this session sign in with it.
const mockPins = new Map<string, string>();
const mockNames = new Map<string, string>();
let mockPhone = "";

export async function requestOtp(phone: string, opts: { forgotPin?: boolean } = {}): Promise<OtpRequest> {
  if (ENV.useMock) {
    await wait(600);
    mockPhone = phone;
    if (mockPins.has(phone) && !opts.forgotPin) return { expiresIn: 0, delivery: "pin", phoneName: "Tecno Spark 10 Pro" };
    return { expiresIn: 300, delivery: "app", code: String(Math.floor(100000 + Math.random() * 900000)) };
  }
  const r = await api<Partial<OtpRequest>>("/auth/otp/request", { method: "POST", body: opts.forgotPin ? { phone, forgotPin: true } : { phone } });
  // An older server answers { expiresIn } only: that's SMS (or the log).
  return { expiresIn: r.expiresIn ?? 300, delivery: r.delivery ?? "sms", code: r.code, phoneName: r.phoneName || undefined };
}

/** Signs in with the 4-digit PIN. The server's message says how many tries are left, or about a pause or lock. */
export async function verifyPin(phone: string, pin: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
  if (ENV.useMock) {
    await wait(600);
    if (mockPins.get(phone) !== pin) throw new ApiError("Wrong PIN. 4 tries left before a 30-minute pause.", 400, "wrong_pin");
    return { token: "mock-token", user: { ...mockUser(phone), name: mockNames.get(phone) ?? mockUser(phone).name, hasPin: true, needsPin: false }, isNewUser: false };
  }
  return api("/auth/pin/verify", { method: "POST", body: { phone, pin } });
}

/** Creates the sign-in PIN, or changes it (then the current PIN is needed). */
export async function setPin(pin: string, current: User, currentPin?: string): Promise<User> {
  if (ENV.useMock) {
    await wait(500);
    if (current.hasPin && mockPins.get(current.phone || mockPhone) !== currentPin) throw new ApiError(t("Your current PIN isn't right."), 400, "wrong_pin");
    mockPins.set(current.phone || mockPhone, pin);
    return { ...current, hasPin: true, needsPin: false };
  }
  const r = await api<{ user: User }>("/me/pin", { method: "POST", body: currentPin ? { pin, currentPin } : { pin } });
  return r.user;
}

export async function verifyOtp(phone: string, code: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
  if (ENV.useMock) {
    await wait(700);
    if (!/^\d{6}$/.test(code)) throw new ApiError(t("Enter the 6-digit code from the SMS."), 400, "invalid_code");
    return { token: "mock-token", user: { ...mockUser(phone), hasPin: mockPins.has(phone), needsPin: !mockPins.has(phone) }, isNewUser: !mockPins.has(phone) };
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
  if (ENV.useMock) { await wait(400); if (patch.name) mockNames.set(current.phone || mockPhone, patch.name); return { ...current, ...patch }; }
  const r = await api<{ user: User }>("/me", { method: "PATCH", body: patch });
  return r.user;
}
