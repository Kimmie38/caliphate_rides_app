import { useLocalSearchParams } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Txt } from "../../src/components/ui";
import { ENV } from "../../src/config/env";
import { formatNgPhone } from "../../src/lib/phone";
import { DEMO, DEMO_RIDER } from "../../src/config/demo";
import { verifyOtp, type CodeDelivery } from "../../src/services/auth";
import { allowNotifications, clearCode, codeWaiting, notificationsAllowed, onCodeTapped, openNotificationSettings, sendSignInCode, sendWaitingCode } from "../../src/lib/codeNotice";
import { BRAND } from "../../src/config/brand";
import { Icon } from "../../src/components/Icon";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";
import { t, useI18n } from "../../src/i18n";

const LEN = 6;

export default function Verify() {
  useI18n();
  // forgot = "1": they tapped Forgot PIN. phoneName: the phone this number was last used on.
  const params = useLocalSearchParams<{ phone: string; delivery?: CodeDelivery; code?: string; phoneName?: string; forgot?: string }>();
  const phone = params.phone;
  const forgot = params.forgot === "1";
  const [delivery, setDelivery] = useState<CodeDelivery>(params.delivery ?? "sms");
  const [phoneName, setPhoneName] = useState(params.phoneName ?? "");
  // Notifications are off: the code waits until they're turned on (it's never shown in the app).
  const [blocked, setBlocked] = useState(() => codeWaiting(phone));
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async (value = code) => {
    if (loading) return;
    // Sample mode: any code (or none) works.
    if (value.length !== LEN) { if (!DEMO) return; value = DEMO_RIDER.code; }
    setLoading(true);
    setError(null);
    try {
      const r = await verifyOtp(phone, value);
      clearCode(phone); // the notification has done its job
      // Signing in opens the next screen automatically (name screen for new riders, otherwise home).
      await signIn(r.token, r.user);
    } catch (e: any) {
      setError(e?.message ?? t("That code didn't work. Check it and try again."));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  // Tapping the code's notification brings the app back and fills the code in.
  const verifyRef = useRef(verify);
  verifyRef.current = verify;
  useEffect(() => onCodeTapped(phone, (c) => { setCode(c); setError(null); verifyRef.current(c); }), [phone]);
  // Arrived from a notification tapped while the app was closed: the code is already here.
  useEffect(() => {
    const c = typeof params.code === "string" && /^\d{6}$/.test(params.code) ? params.code : null;
    if (c) { setCode(c); verifyRef.current(c); }
  }, [params.code]);

  const resend = async () => {
    setSeconds(60);
    setError(null);
    try {
      const r = await sendSignInCode(phone, { forgotPin: forgot });
      setDelivery(r.delivery);
      if (r.phoneName) setPhoneName(r.phoneName);
      setBlocked(codeWaiting(phone));
    } catch (e: any) { setError(e?.message ?? t("Couldn't resend the code.")); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack("/(auth)/welcome")} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="hero" style={{ marginTop: 8 }}>{forgot ? t("Reset your PIN") : t("Enter the code")}</Txt>
        <Txt color="muted">
          {delivery === "app" && blocked ? t("We send your code as a notification, but notifications are off for Caliphate Rides on this phone.")
            : delivery === "app" ? t("We sent your code to this phone as a notification. Pull down from the top of the screen to see it.")
            : delivery === "support" ? t("For {0}", formatNgPhone(phone))
            : t("Sent to {0}", phone ? formatNgPhone(phone) : t("your phone"))}
        </Txt>
        {delivery === "app" && blocked ? <TurnOnNotifications onAllowed={() => setBlocked(false)} onFailed={setError} phone={phone} /> : null}
        {delivery === "support" ? <SupportNote phoneName={phoneName} /> : null}
        {forgot && delivery === "app" && !blocked ? <Txt variant="caption" color="muted">{t("After the code, you'll create a new PIN.")}</Txt> : null}

        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t("Verification code")} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {Array.from({ length: LEN }).map((_, i) => {
            const active = i === Math.min(code.length, LEN - 1);
            return (
              <View key={i} style={{ flex: 1, height: 60, borderRadius: 14, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: active ? colors.green : "transparent" }}>
                <Txt style={{ fontFamily: fonts.display, fontSize: 24 }}>{code[i] ?? ""}</Txt>
              </View>
            );
          })}
        </Pressable>
        {/* One hidden field receives typing and SMS autofill; the boxes above just display it. */}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, "").slice(0, LEN);
            setCode(v);
            setError(null);
            if (v.length === LEN) verify(v);
          }}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LEN}
          style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
        />

        {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
        {seconds > 0 ? (
          <Txt variant="caption" color="muted" tabular>{t("Resend code in 0:{0}", String(seconds).padStart(2, "0"))}</Txt>
        ) : (
          <Pressable onPress={resend} accessibilityRole="button"><Txt variant="label" color="greenText">{t("Resend code")}</Txt></Pressable>
        )}
        {ENV.useMock ? <Txt variant="caption" color="muted">{t("Sample mode: any 6 digits work.")}</Txt> : null}

        <View style={{ flex: 1 }} />
        <Button title={t("Verify")} onPress={() => verify()} loading={loading} disabled={!DEMO && code.length !== LEN} />
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Notifications are off, so the code couldn't arrive. As soon as they're allowed (the phone's prompt,
 * or the person switches them on in Settings and comes back), this card goes away and the waiting
 * code is sent as a notification.
 */
function TurnOnNotifications({ phone, onAllowed, onFailed }: { phone: string; onAllowed: () => void; onFailed: (message: string) => void }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  const allowed = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    onAllowed(); // hide the card straight away
    if (!(await sendWaitingCode(phone))) onFailed(t("We couldn't show the notification. Tap Resend code to get a new one."));
  }, [phone, onAllowed, onFailed]);

  // Back from Settings: check whether notifications are on now.
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (s) => {
      if (s === "active" && (await notificationsAllowed())) allowed();
    });
    return () => sub.remove();
  }, [allowed]);

  const turnOn = async () => {
    setBusy(true);
    if (await allowNotifications()) await allowed(); // the phone asked, and they tapped Allow
    else await openNotificationSettings(); // blocked before: only Settings can switch them on
    setBusy(false);
  };

  return (
    <Animated.View entering={FadeInDown.duration(350)} exiting={FadeOut.duration(200)} accessibilityLiveRegion="polite"
      style={{ gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.greenSoft }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={21} color="#FFFFFF" />
        </View>
        <Txt variant="bodyStrong" style={{ flex: 1 }}>{t("Turn on notifications to get your code")}</Txt>
      </View>
      <Txt color="muted">{t("Your code arrives the moment you turn them on. You don't need to ask for a new one.")}</Txt>
      <Button title={t("Turn on notifications")} icon="bell" onPress={turnOn} loading={busy} />
    </Animated.View>
  );
}

/** This number already has an account on other phones: support confirms it's them before giving the code. */
function SupportNote({ phoneName }: { phoneName?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6, padding: 14, borderRadius: 18, backgroundColor: colors.greenSoft }}>
      <Txt variant="bodyStrong">{phoneName ? t("This number is set up on a {0}", phoneName) : t("This number is already used on another phone")}</Txt>
      <Txt>{t("To keep your account safe, call support on {0}. We'll call your number back and read you the code.", BRAND.supportPhone)}</Txt>
    </View>
  );
}
