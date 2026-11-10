import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Txt } from "../../src/components/ui";
import { BRAND } from "../../src/config/brand";
import { DEMO, DEMO_RIDER } from "../../src/config/demo";
import { goBack } from "../../src/lib/nav";
import { maskLocal, normalizeNgPhone } from "../../src/lib/phone";
import { requestOtp } from "../../src/services/auth";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";
import { t, useI18n } from "../../src/i18n";

/** Sign in with a phone number and a code: the demo numbers, and SMS if it's switched on. */
export default function PhoneSignIn() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sample mode: an empty number signs in with a sample one.
  const phone = normalizeNgPhone(local) ?? (DEMO && !local.trim() ? DEMO_RIDER.phone : null);

  const send = async () => {
    if (!phone) return setError(t("Enter a Nigerian mobile number, like 803 214 5567."));
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone);
      router.push({ pathname: "/(auth)/verify", params: { phone } });
    } catch (e: any) {
      setError(e?.message ?? t("Couldn't send the code. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack("/(auth)/welcome")} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="hero" style={{ marginTop: 8 }}>{t("Phone number and code")}</Txt>
        <Txt color="muted">{t("For demo numbers, or if you were given a code.")}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", height: 62, borderRadius: 18, borderWidth: 2, borderColor: error ? colors.danger : focused ? colors.green : colors.line, overflow: "hidden", marginTop: 6 }}>
        <View style={{ height: "100%", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.greenSoft }}>
          {/* Nigerian flag */}
          <View style={{ flexDirection: "row", width: 22, height: 15, borderRadius: 3, overflow: "hidden" }}>
            <View style={{ flex: 1, backgroundColor: "#008751" }} /><View style={{ flex: 1, backgroundColor: "#FFFFFF" }} /><View style={{ flex: 1, backgroundColor: "#008751" }} />
          </View>
          <Txt style={{ fontFamily: fonts.display, fontSize: 16, color: colors.greenText }}>+234</Txt>
        </View>
        <TextInput
          accessibilityLabel={t("Phone number")}
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
        <Button title={t("Continue")} onPress={send} loading={loading} disabled={!phone} />
        <Txt variant="caption" color="muted" align="center">{t("By continuing you agree to {0}'s terms.", BRAND.name)}</Txt>
        {DEMO ? <Txt variant="caption" color="greenText" align="center">{t("Sample mode: tap Continue to skip ahead with sample details.")}</Txt> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
