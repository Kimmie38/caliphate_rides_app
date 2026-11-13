import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// The phone's secure storage (Android Keystore / iPhone Keychain). The web preview has no secure
// storage, so it uses the browser's local storage there instead.
const web = Platform.OS === "web";
const ls = () => (globalThis as any).localStorage as Storage | undefined;

export const secureStore = {
  async get(key: string): Promise<string | null> {
    if (web) { try { return ls()?.getItem(key) ?? null; } catch { return null; } }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (web) { try { ls()?.setItem(key, value); } catch { /* private mode */ } return; }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (web) { try { ls()?.removeItem(key); } catch { /* private mode */ } return; }
    await SecureStore.deleteItemAsync(key);
  },
};
