import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { BRAND } from "../config/brand";
import { t } from "../i18n";
import { requestOtp, type OtpRequest } from "../services/auth";

// Shows a sign-in code from the server as a notification on this phone (SMS_PROVIDER=app).
// The code is only ever shown in the notification, never inside the app. If notifications are off,
// the code waits here (in memory, not on screen) until the person turns them on, then it's sent.

const CHANNEL = "sign-in-codes";
const GREEN = "#00874F"; // tints the icon and app name in the notification header (Android)
const KIND = "sign-in-code";
let ready = false;

async function setUp() {
  if (ready) return;
  // Show it as a banner even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: t("Sign-in codes"),
      description: t("The code you type to sign in."),
      importance: Notifications.AndroidImportance.HIGH, // pops up at the top of the screen
      vibrationPattern: [0, 180],
      lightColor: GREEN,
      showBadge: false,
    });
  }
  ready = true;
}

/** True if this app may show notifications right now (doesn't ask). */
export async function notificationsAllowed(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try { return (await Notifications.getPermissionsAsync()).granted; } catch { return false; }
}

/** Asks for permission to show notifications (Android 13+ and iPhone show a prompt the first time). */
export async function allowNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await setUp();
    const now = await Notifications.getPermissionsAsync();
    if (__DEV__) console.log("[sign-in code] notification permission:", now.status, "can ask again:", now.canAskAgain);
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    // iPhone: banners and sound only (no red badge on the app icon for a code).
    // Android 13+: the system prompt; older Android allows notifications without asking.
    const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    if (__DEV__) console.log("[sign-in code] permission after asking:", asked.status);
    return asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch (e: any) {
    if (__DEV__) console.warn("[sign-in code] couldn't set up notifications:", e?.message ?? e);
    return false;
  }
}

// A code still waiting because notifications are off, and the notification showing each code.
const waiting = new Map<string, string>();
const shownAs = new Map<string, string>();

/** True when this number's code couldn't be shown because notifications are off. */
export const codeWaiting = (phone: string) => waiting.has(phone);

/** Opens this app's page in the phone's Settings, where notifications are switched on. */
export const openNotificationSettings = () => Linking.openSettings().catch(() => {});

/**
 * Sends the waiting code once notifications are allowed (asks first when the phone still can).
 * Returns true if the notification went out.
 */
export async function sendWaitingCode(phone: string): Promise<boolean> {
  const code = waiting.get(phone);
  if (!code) return true;
  return showCode(phone, code);
}

/** Puts the code in a notification. Returns false (and keeps the code waiting) if notifications are off. */
export async function showCode(phone: string, code: string): Promise<boolean> {
  if (await allowNotifications()) {
    try {
      await clearCode(phone); // only ever one code on screen
      // Android already shows "Caliphate Rides" and our icon above this; iPhone shows the app icon.
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: Platform.OS === "ios" ? BRAND.name : t("{0} is your sign-in code", code),
          subtitle: Platform.OS === "ios" ? t("{0} is your sign-in code", code) : undefined,
          body: t("Tap to fill it in. It expires in 5 minutes. Never share it with anyone."),
          data: { kind: KIND, phone, code },
          sound: "default",
          color: GREEN,
          priority: Notifications.AndroidNotificationPriority.MAX,
          autoDismiss: true,
        },
        trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
      });
      shownAs.set(phone, id);
      waiting.delete(phone);
      if (__DEV__) console.log("[sign-in code] notification shown");
      return true;
    } catch (e: any) {
      if (__DEV__) console.warn("[sign-in code] couldn't show the notification:", e?.message ?? e);
    }
  }
  waiting.set(phone, code);
  return false;
}

/**
 * Asks the server for a sign-in code for this number and, when the server hands it to the app,
 * shows it as a notification. Returns how the code was delivered.
 */
export async function sendSignInCode(phone: string, opts: { forgotPin?: boolean } = {}): Promise<Omit<OtpRequest, "code">> {
  const r = await requestOtp(phone, opts);
  if (__DEV__) console.log("[sign-in code] server answered:", r.delivery);
  if (r.delivery === "app" && r.code) await showCode(phone, r.code);
  return { expiresIn: r.expiresIn, delivery: r.delivery, phoneName: r.phoneName }; // the code itself never goes to a screen
}

/** Removes the code notification (after signing in, or when a new code replaces it). */
export async function clearCode(phone: string) {
  const id = shownAs.get(phone);
  if (!id) return;
  shownAs.delete(phone);
  await Notifications.dismissNotificationAsync(id).catch(() => {});
}

type CodeData = { kind?: string; phone?: string; code?: string };
const codeIn = (r: Notifications.NotificationResponse | null) => {
  const d = r?.notification.request.content.data as CodeData | undefined;
  return d?.kind === KIND && typeof d.phone === "string" && typeof d.code === "string" ? { phone: d.phone, code: d.code, at: r!.notification.date } : null;
};

/** Calls back with the code when the person taps its notification. Returns a function that stops listening. */
export function onCodeTapped(phone: string, fill: (code: string) => void): () => void {
  if (Platform.OS === "web") return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const c = codeIn(r);
    if (c?.phone !== phone) return;
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    fill(c.code);
  });
  return () => sub.remove();
}

/**
 * If the phone closed the app while the person was in the notification shade (cheap Androids do this
 * to save memory), tapping the code opens the app from scratch. This finds that tap so the sign-in
 * screen can carry on with the code. Codes older than 5 minutes have expired, so they're ignored.
 */
export async function takeCodeTappedWhileClosed(): Promise<{ phone: string; code: string } | null> {
  if (Platform.OS === "web") return null;
  try {
    const c = codeIn(await Notifications.getLastNotificationResponseAsync());
    if (!c) return null;
    await Notifications.clearLastNotificationResponseAsync();
    const at = c.at < 1e12 ? c.at * 1000 : c.at; // seconds on some platforms, milliseconds on others
    return Date.now() - at < 5 * 60 * 1000 ? { phone: c.phone, code: c.code } : null;
  } catch {
    return null;
  }
}
