import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CodeInput } from "../../src/components/CodeInput";
import { Icon } from "../../src/components/Icon";
import { IconButton, Txt } from "../../src/components/ui";
import { ENV } from "../../src/config/env";
import { t, useI18n } from "../../src/i18n";
import { sendSignInCode } from "../../src/lib/codeNotice";
import { goBack } from "../../src/lib/nav";
import { formatNgPhone } from "../../src/lib/phone";
import { pinMessage } from "../../src/lib/pinErrors";
import { verifyPin } from "../../src/services/auth";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";

/**
 * Signing back in to an account that has a PIN: after logging out, deleting and reinstalling the
 * app, or on another phone. "Forgot PIN?" sends a code (on a phone they've used) or points to support.
 */
export default function EnterPin() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const { phone, phoneName } = useLocalSearchParams<{ phone: string; phoneName?: string }>();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false); // paused or locked: only Forgot PIN helps now

  const check = async (value: string) => {
    if (busy || value.length !== 4) return;
    setBusy(true); setError(null);
    try {
      const r = await verifyPin(phone, value);
      await signIn(r.token, r.user); // opens home (or the name screen) by itself
    } catch (e: any) {
      setError(pinMessage(e, t("Couldn't check your PIN. Check your connection and try again.")));
      setBlocked(e?.code === "pin_paused" || e?.code === "pin_locked");
      setPin("");
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await sendSignInCode(phone, { forgotPin: true });
      router.push({ pathname: "/(auth)/verify", params: { phone, delivery: r.delivery, phoneName: r.phoneName ?? phoneName ?? "", forgot: "1" } });
    } catch (e: any) {
      setError(e?.message ?? t("Couldn't send the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack("/(auth)/phone")} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="hero" style={{ marginTop: 8 }}>{t("Welcome back")}</Txt>
        <Txt color="muted">{t("Enter the 4-digit PIN for {0}.", formatNgPhone(phone))}</Txt>
        {phoneName ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Icon name="phone" size={16} color={colors.muted} />
            <Txt variant="caption" color="muted" style={{ flex: 1 }}>{t("Last used on a {0}", phoneName)}</Txt>
          </View>
        ) : null}

        <View style={{ marginTop: 10, opacity: blocked ? 0.4 : 1 }} pointerEvents={blocked ? "none" : "auto"}>
          <CodeInput value={pin} onChange={(v) => { setPin(v); setError(null); }} onComplete={check} length={4} secret label={t("Sign-in PIN")} autoFocus={!blocked} />
        </View>
        {error ? <Txt variant="caption" style={{ color: colors.danger }} accessibilityLiveRegion="polite">{error}</Txt> : null}
        {busy ? <Txt variant="caption" color="muted">{t("Checking…")}</Txt> : null}

        <Pressable onPress={forgot} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start", marginTop: 4 }}>
          <Txt variant="label" color="greenText">{t("Forgot PIN?")}</Txt>
        </Pressable>
        <Pressable onPress={() => goBack("/(auth)/phone")} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start" }}>
          <Txt variant="label" color="muted">{t("Not your number? Change it")}</Txt>
        </Pressable>
        {ENV.useMock ? <Txt variant="caption" color="muted">{t("Sample mode: use the PIN you created.")}</Txt> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
