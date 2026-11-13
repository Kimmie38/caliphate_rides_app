import * as Application from "expo-application";
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from "expo-crypto";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { secureStore } from "./secureStore";

// An ID for this phone that the server uses to recognise phones an account has used before.
//  - Android: made from Android's own ID for this app, which stays the same when the app is deleted
//    and installed again (it only changes after a factory reset). Hashed, so the raw ID never leaves.
//  - iPhone: a random ID kept in the Keychain, which also survives deleting the app.
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

async function androidId(): Promise<string> {
  const raw = Application.getAndroidId();
  if (!raw) return "";
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, `caliphate-rides:${raw}`); // 64 hex characters
}

async function load(): Promise<string> {
  if (Platform.OS === "android") {
    try {
      const id = await androidId();
      if (id) return id;
    } catch { /* falls back to a stored random ID */ }
  }
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
/** This phone's ID ("" if it can't be worked out). Cached after the first call. */
export const deviceId = () => (pending ??= load());

/** The phone's make and model, e.g. "Tecno Spark 10 Pro" or "iPhone 13" ("" if unknown). */
export function deviceName(): string {
  if (Platform.OS === "web") return "";
  const model = (Device.modelName ?? "").trim();
  const brand = (Device.brand ?? Device.manufacturer ?? "").trim();
  if (!model) return brand;
  const pretty = (s: string) => (s === s.toUpperCase() && s.length > 3 ? s[0] + s.slice(1).toLowerCase() : s); // "TECNO" -> "Tecno"
  if (!brand || Platform.OS === "ios" || model.toLowerCase().startsWith(brand.toLowerCase())) return pretty(model).slice(0, 60);
  return `${pretty(brand)} ${model}`.slice(0, 60);
}
