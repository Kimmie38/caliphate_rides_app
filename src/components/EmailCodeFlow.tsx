import React, { useEffect, useState } from "react";
import { TextInput, View, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ENV } from "../config/env";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";
import { CodeInput } from "./CodeInput";
import { Icon } from "./Icon";
import { Button, Txt } from "./ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Email, then the 6-digit code we email. Used to sign in, and to add a sign-in email to an account. */
export function EmailCodeFlow({ request, verify, initialEmail = "", submitLabel }: {
  request: (email: string) => Promise<unknown>;
  verify: (email: string, code: string) => Promise<void>;
  initialEmail?: string;
  submitLabel?: string;
}) {
  const { colors } = useTheme();
  const [email, setEmail] = useState(initialEmail);
  const [focused, setFocused] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const valid = EMAIL.test(email.trim());

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const send = async () => {
    if (!valid) return setError(t("Enter a valid email address, like name@gmail.com."));
    setLoading(true); setError(null);
    try {
      await request(email.trim().toLowerCase());
      setStep("code"); setCode(""); setSeconds(45);
    } catch (e: any) {
      setError(e?.message ?? t("We couldn't send the email. Check the address and try again."));
    } finally { setLoading(false); }
  };

  const confirm = async (value = code) => {
    if (loading || value.length !== 6) return;
    setLoading(true); setError(null);
    try { await verify(email.trim().toLowerCase(), value); }
    catch (e: any) { setError(e?.message ?? t("That code didn't work. Check the email and try again.")); setCode(""); }
    finally { setLoading(false); }
  };

  if (step === "email") {
    return (
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", height: 60, borderRadius: 18, borderWidth: 2, borderColor: error ? colors.danger : focused ? colors.green : colors.line, paddingHorizontal: 14, gap: 10 }}>
          <Icon name="mail" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel={t("Email address")}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={send}
            placeholder="name@gmail.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            autoFocus
            style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink }}
          />
        </View>
        {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
        <Button title={t("Send me a code")} onPress={send} loading={loading} disabled={!valid} />
        <Txt variant="caption" color="muted" align="center">{t("We'll email you a 6-digit code. It's free.")}</Txt>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Txt color="muted">{t("We sent a code to")}</Txt>
        <Txt variant="bodyStrong">{email.trim().toLowerCase()}</Txt>
      </View>
      <CodeInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={confirm} oneTimeCode="email" />
      {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Txt variant="caption" color="muted">{t("Can't see it? Check Spam or Promotions.")}</Txt>
      <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
        {seconds > 0 ? (
          <Txt variant="caption" color="muted" tabular>{t("Resend code in 0:{0}", String(seconds).padStart(2, "0"))}</Txt>
        ) : (
          <Pressable onPress={send} accessibilityRole="button"><Txt variant="label" color="greenText">{t("Resend code")}</Txt></Pressable>
        )}
        <Pressable onPress={() => { setStep("email"); setError(null); }} accessibilityRole="button"><Txt variant="label" color="greenText">{t("Change email")}</Txt></Pressable>
      </View>
      {ENV.useMock ? <Txt variant="caption" color="muted">{t("Sample mode: any 6 digits work.")}</Txt> : null}
      <Button title={submitLabel ?? t("Verify")} onPress={() => confirm()} loading={loading} disabled={code.length !== 6} />
    </Animated.View>
  );
}
