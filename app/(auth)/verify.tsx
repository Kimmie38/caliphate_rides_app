import { useLocalSearchParams } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Txt } from "../../src/components/ui";
import { ENV } from "../../src/config/env";
import { formatNgPhone } from "../../src/lib/phone";
import { DEMO, DEMO_RIDER } from "../../src/config/demo";
import { requestOtp, verifyOtp } from "../../src/services/auth";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";

const LEN = 6;

export default function Verify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const input = useRef<TextInput>(null);
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
      // Signing in opens the next screen automatically (name screen for new riders, otherwise home).
      await signIn(r.token, r.user);
    } catch (e: any) {
      setError(e?.message ?? "That code didn't work. Check the SMS and try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setSeconds(60);
    setError(null);
    try { await requestOtp(phone); } catch (e: any) { setError(e?.message ?? "Couldn't resend the code."); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label="Back" onPress={() => goBack("/(auth)/welcome")} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="hero" style={{ marginTop: 8 }}>Enter the code</Txt>
        <Txt color="muted">Sent to {phone ? formatNgPhone(phone) : "your phone"}</Txt>

        <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
          <Txt variant="caption" color="muted" tabular>Resend code in 0:{String(seconds).padStart(2, "0")}</Txt>
        ) : (
          <Pressable onPress={resend} accessibilityRole="button"><Txt variant="label" color="greenText">Resend code</Txt></Pressable>
        )}
        {ENV.useMock ? <Txt variant="caption" color="muted">Sample mode: any 6 digits work.</Txt> : null}

        <View style={{ flex: 1 }} />
        <Button title="Verify" onPress={() => verify()} loading={loading} disabled={!DEMO && code.length !== LEN} />
      </View>
    </KeyboardAvoidingView>
  );
}
