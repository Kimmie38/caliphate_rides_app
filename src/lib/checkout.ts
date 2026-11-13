import { Linking, Platform } from "react-native";
import { appAlert } from "../components/AppAlert";
import { t } from "../i18n";
import { optional } from "./optional";

const WebBrowser = optional(() => require("expo-web-browser") as typeof import("expo-web-browser"));

/** How a payment page ended, as the server's last page reported it. The app still re-checks with the server. */
export type CheckoutResult = "success" | "pending" | "cancelled" | "failed" | "closed";

// The server's result page goes to caliphaterides://payment?status=… (see the backend's payments.js),
// which closes the sheet. Must match "scheme" in app.config.ts.
const RETURN_URL = "caliphaterides://payment";

/**
 * Opens the payment page (Flutterwave, or the demo page) in a secure sheet inside the app:
 * Chrome Custom Tabs on Android, Safari on iPhone. It closes by itself when the payment finishes
 * and the person is back in the app. "closed" means they closed it themselves.
 */
export async function openCheckout(url: string): Promise<CheckoutResult> {
  if (Platform.OS === "web" || !WebBrowser) {
    await Linking.openURL(url);
    return "closed";
  }
  try {
    const r = await WebBrowser.openAuthSessionAsync(url, RETURN_URL, { showInRecents: true });
    if (r.type !== "success") return "closed";
    const status = r.url.match(/[?&]status=([a-z]+)/)?.[1];
    return status === "success" || status === "pending" || status === "cancelled" ? status : "failed";
  } catch {
    // No browser that supports sheets (very rare): open the phone's browser instead.
    await Linking.openURL(url);
    return "closed";
  }
}

/** A short message for how the payment ended (nothing for "success" when the screen shows it already). */
export function explainCheckout(result: CheckoutResult, success: string) {
  if (result === "success") appAlert(t("Payment received"), success, undefined, { icon: "check" });
  else if (result === "pending") appAlert(t("Payment processing"), t("If you finished paying, it's being confirmed. It updates here as soon as it's through."), undefined, { icon: "time", tone: "amber" });
  else if (result === "failed") appAlert(t("Payment not completed"), t("We couldn't confirm this payment. Nothing was taken if it didn't go through. Try again, or choose another way to pay."), undefined, { icon: "alert", tone: "danger" });
  // cancelled / closed: they chose to stop, so no message
}
