import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../src/components/Logo";
import { Button, Txt } from "../../src/components/ui";
import { Hero } from "../../src/components/visual";
import { BRAND } from "../../src/config/brand";
import { DEMO, DEMO_RIDER } from "../../src/config/demo";
import { maskLocal, normalizeNgPhone } from "../../src/lib/phone";
import { requestOtp } from "../../src/services/auth";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts, radius } from "../../src/theme/tokens";

export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sample mode: an empty number signs in with a sample one.
  const phone = normalizeNgPhone(local) ?? (DEMO && !local.trim() ? DEMO_RIDER.phone : null);

  const send = async () => {
    if (!phone) return setError("Enter a Nigerian mobile number, like 803 214 5567.");
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone);
      router.push({ pathname: "/(auth)/verify", params: { phone } });
    } catch (e: any) {
      setError(e?.message ?? "Couldn't send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Brand hero */}
        <Hero style={{ borderRadius: 0, minHeight: 420, paddingTop: insets.top + 24, paddingBottom: 64, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <Logo size={170} style={{ shadowColor: "#00301B", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }} />
          </Animated.View>
          <Txt style={{ color: "#FFFFFF", opacity: 0.9, fontFamily: fonts.bodySemi }}>Rides across Sokoto, from keke to car</Txt>
        </Hero>

        {/* Sign-in card overlapping the hero */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}
          style={{ flex: 1, marginTop: -36, backgroundColor: colors.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 22, paddingTop: 28, paddingBottom: insets.bottom + 20, gap: 14 }}>
          <Txt variant="hero" style={{ fontSize: 28, lineHeight: 32 }}>Welcome</Txt>
          <Txt color="muted" style={{ marginTop: -6 }}>Book a ride, or sign up to drive your own keke or car.</Txt>

          <View style={{ flexDirection: "row", alignItems: "center", height: 62, borderRadius: 18, borderWidth: 2, borderColor: error ? colors.danger : focused ? colors.green : colors.line, overflow: "hidden", marginTop: 6 }}>
            <View style={{ height: "100%", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.greenSoft }}>
              {/* Nigerian flag */}
              <View style={{ flexDirection: "row", width: 22, height: 15, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ flex: 1, backgroundColor: "#008751" }} /><View style={{ flex: 1, backgroundColor: "#FFFFFF" }} /><View style={{ flex: 1, backgroundColor: "#008751" }} />
              </View>
              <Txt style={{ fontFamily: fonts.display, fontSize: 16, color: colors.greenText }}>+234</Txt>
            </View>
            <TextInput
              accessibilityLabel="Phone number"
              value={local}
              onChangeText={(t) => { setLocal(maskLocal(t)); setError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={send}
              placeholder="803 214 5567"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={12}
              style={{ flex: 1, paddingHorizontal: 14, fontFamily: fonts.display, fontSize: 18, color: colors.ink, letterSpacing: 0.3 }}
            />
          </View>
          {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
          <Button title="Continue" onPress={send} loading={loading} disabled={!phone} />
          <Txt variant="caption" color="muted" align="center">
            We'll text you a 6-digit code. By continuing you agree to {BRAND.name}'s terms.
          </Txt>
          {DEMO ? <Txt variant="caption" color="greenText" align="center">Sample mode: tap Continue to skip ahead with sample details.</Txt> : null}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
