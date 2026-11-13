import { getRandomBytes } from "expo-crypto";
import { secureStore } from "./secureStore";

// A random ID for this phone, made once and kept in secure storage. The server uses it to show sign-in
// codes in the app only on phones an account has already used (see the backend's src/lib/devices.js).
const KEY = "cr.device";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 32 characters from the phone's secure random generator (Android, iPhone and web). */
function randomId(): string {
  let bytes: Uint8Array;
  try { bytes = getRandomBytes(32); }
  catch {
    bytes = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function load(): Promise<string> {
  try {
    const saved = await secureStore.get(KEY);
    if (saved) return saved;
    const id = randomId();
    await secureStore.set(KEY, id);
    return id;
  } catch {
    return "";
  }
}

let pending: Promise<string> | null = null;
/** This phone's ID ("" if storage isn't available). Made on first use, then cached. */
export const deviceId = () => (pending ??= load());
