import { ENV } from "../config/env";
import type { User } from "../types";
import { api, ApiError, wait } from "./http";
import { mockUser } from "./mockData";

// Backend contract
// POST /auth/otp/request  { phone }          -> { expiresIn }
// POST /auth/otp/verify   { phone, code }    -> { token, user, isNewUser }
// GET  /me                                    -> { user }
// PATCH /me               { name }            -> { user }

export async function requestOtp(phone: string): Promise<{ expiresIn: number }> {
  if (ENV.useMock) { await wait(600); return { expiresIn: 60 }; }
  return api("/auth/otp/request", { method: "POST", body: { phone } });
}

export async function verifyOtp(phone: string, code: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
  if (ENV.useMock) {
    await wait(700);
    if (!/^\d{6}$/.test(code)) throw new ApiError("Enter the 6-digit code from the SMS.", 400, "invalid_code");
    return { token: "mock-token", user: mockUser(phone), isNewUser: true };
  }
  return api("/auth/otp/verify", { method: "POST", body: { phone, code } });
}

export async function getMe(): Promise<User> {
  const r = await api<{ user: User }>("/me");
  return r.user;
}

export async function updateProfile(patch: { name: string }, current: User): Promise<User> {
  if (ENV.useMock) { await wait(400); return { ...current, ...patch }; }
  const r = await api<{ user: User }>("/me", { method: "PATCH", body: patch });
  return r.user;
}
