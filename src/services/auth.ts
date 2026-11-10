import { ENV } from "../config/env";
import type { User } from "../types";
import { api, ApiError, wait } from "./http";
import { mockUser } from "./mockData";
import { t } from "../i18n";

// Backend contract
// GET  /auth/methods                          -> { whatsapp, whatsappNumber, email, sms }
// POST /auth/whatsapp/start                   -> WhatsAppStart
// POST /auth/whatsapp/check { checkId, secret } -> { status: "pending" } | { status: "confirmed", token, user, isNewUser }
// POST /auth/email/request { email, lang }    -> { expiresIn }
// POST /auth/email/verify  { email, code }    -> { token, user, isNewUser }
// POST /me/phone/whatsapp/start | check       -> add a phone to an account made by email
// POST /me/sign-in-email/request | verify     -> add or change the email used to sign in
// POST /auth/otp/request  { phone }          -> { expiresIn }
// POST /auth/otp/verify   { phone, code }    -> { token, user, isNewUser }
// GET  /me                                    -> { user }
// PATCH /me               { name?, email?, language? }  -> { user }

export async function requestOtp(phone: string): Promise<{ expiresIn: number }> {
  if (ENV.useMock) { await wait(600); return { expiresIn: 60 }; }
  return api("/auth/otp/request", { method: "POST", body: { phone } });
}

export async function verifyOtp(phone: string, code: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
  if (ENV.useMock) {
    await wait(700);
    if (!/^\d{6}$/.test(code)) throw new ApiError(t("Enter the 6-digit code from the SMS."), 400, "invalid_code");
    return { token: "mock-token", user: mockUser(phone), isNewUser: true };
  }
  return api("/auth/otp/verify", { method: "POST", body: { phone, code } });
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

// ---- Free sign-in: WhatsApp and email

export type SignInMethods = { whatsapp: boolean; whatsappNumber: string; email: boolean; sms: boolean };
export type WhatsAppStart = { checkId: string; secret: string; code: string; link: string; number: string; message: string; expiresIn: number };
type Session = { token: string; user: User; isNewUser: boolean };
export type WhatsAppResult = { status: "pending" } | ({ status: "confirmed" } & Session);

/** Which ways to sign in the server has switched on. An older server (none of them) means phone codes only. */
export async function getSignInMethods(): Promise<SignInMethods> {
  if (ENV.useMock) return { whatsapp: true, whatsappNumber: "2348000000000", email: true, sms: true };
  try { return await api<SignInMethods>("/auth/methods"); }
  catch { return { whatsapp: false, whatsappNumber: "", email: false, sms: true }; }
}

// Sample mode: the "message" arrives a few seconds after the code is shown.
const mockChecks = new Map<string, number>();
const mockStart = (): WhatsAppStart => {
  const code = Array.from({ length: 8 }, () => "23456789ABCDEFGHJKMNPQRSTUVWXYZ"[Math.floor(Math.random() * 31)]).join("");
  const checkId = `mock_${Date.now()}`;
  mockChecks.set(checkId, Date.now() + 6000);
  return { checkId, secret: "mock", code, number: "2348000000000", message: `Caliphate Rides code: ${code}`, link: `https://wa.me/2348000000000?text=${encodeURIComponent(`Caliphate Rides code: ${code}`)}`, expiresIn: 600 };
};
const mockConfirmed = (id: string) => (mockChecks.get(id) ?? Infinity) < Date.now();

export async function startWhatsApp(): Promise<WhatsAppStart> {
  if (ENV.useMock) { await wait(400); return mockStart(); }
  return api("/auth/whatsapp/start", { method: "POST" });
}

export async function checkWhatsApp(s: WhatsAppStart): Promise<WhatsAppResult> {
  if (ENV.useMock) return mockConfirmed(s.checkId) ? { status: "confirmed", token: "mock-token", user: mockUser("+2348031234567"), isNewUser: true } : { status: "pending" };
  return api("/auth/whatsapp/check", { method: "POST", body: { checkId: s.checkId, secret: s.secret } });
}

export async function requestEmailCode(email: string, lang: "en" | "ha"): Promise<{ expiresIn: number }> {
  if (ENV.useMock) { await wait(600); return { expiresIn: 600 }; }
  return api("/auth/email/request", { method: "POST", body: { email, lang } });
}

export async function verifyEmailCode(email: string, code: string): Promise<Session> {
  if (ENV.useMock) {
    await wait(600);
    if (!/^\d{6}$/.test(code)) throw new ApiError(t("Enter the 6-digit code from the email."), 400, "invalid_code");
    return { token: "mock-token", user: { ...mockUser(""), phone: "", email, signInEmail: email }, isNewUser: true };
  }
  return api("/auth/email/verify", { method: "POST", body: { email, code } });
}

/** Adding a phone number to a signed-in account, with WhatsApp. */
export async function startPhoneLink(): Promise<WhatsAppStart> {
  if (ENV.useMock) { await wait(400); return mockStart(); }
  return api("/me/phone/whatsapp/start", { method: "POST" });
}

export async function checkPhoneLink(s: WhatsAppStart, current: User): Promise<{ status: "pending" } | { status: "confirmed"; user: User }> {
  if (ENV.useMock) return mockConfirmed(s.checkId) ? { status: "confirmed", user: { ...current, phone: "+2348031234567" } } : { status: "pending" };
  return api("/me/phone/whatsapp/check", { method: "POST", body: { checkId: s.checkId, secret: s.secret } });
}

/** Adding (or changing) the email someone can sign in with. */
export async function requestSignInEmail(email: string, lang: "en" | "ha"): Promise<{ expiresIn: number }> {
  if (ENV.useMock) { await wait(600); return { expiresIn: 600 }; }
  return api("/me/sign-in-email/request", { method: "POST", body: { email, lang } });
}

export async function verifySignInEmail(email: string, code: string, current: User): Promise<User> {
  if (ENV.useMock) { await wait(600); return { ...current, signInEmail: email, email: current.email || email }; }
  const r = await api<{ user: User }>("/me/sign-in-email/verify", { method: "POST", body: { email, code } });
  return r.user;
}
