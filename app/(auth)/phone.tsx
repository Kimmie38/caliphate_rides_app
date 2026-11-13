import { router } from "expo-router";
import { errorText } from "../../src/services/http";
import React, { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../src/components/Icon";
import { Button, IconButton, Txt } from "../../src/components/ui";
import { BRAND } from "../../src/config/brand";
import { DEMO, DEMO_RIDER } from "../../src/config/demo";
import { sendSignInCode } from "../../src/lib/codeNotice";
import { goBack } from "../../src/lib/nav";
import { formatNgPhone, maskLocal, normalizeNgPhone } from "../../src/lib/phone";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";
import { t, useI18n } from "../../src/i18n";

/** How long the number stays on screen before Continue appears, so people check it properly. */
const CHECK_SECONDS = 10;

/**
 * Sign in with a phone number:
 *  1. type the number;
 *  2. check it on its own screen ("Edit number", and Continue after a few seconds). Nothing is sent
 *     to the server until Continue;
 *  3. a new number gets a code (a notification from the app) and then creates a PIN; a number that
 *     already has an account signs in with its 4-digit PIN instead.
 */
export default function PhoneSignIn() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const field = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [local, setLocal] = useState("");
  const [focused, setFocused] = useState(false);
  const [step, setStep] = useState<"type" | "check">("type");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sample mode: an empty number signs in with a sample one.
  const phone = normalizeNgPhone(local) ?? (DEMO && !local.trim() ? DEMO_RIDER.phone : null);

  const next = () => {
    if (!phone) return setError(t("Enter a Nigerian mobile number, like 803 214 5567."));
    setError(null);
    Keyboard.dismiss(); // the whole check screen is visible, not hidden behind the keyboard
    setStep("check");
  };

  const edit = () => {
    setError(null);
    setStep("type");
    setTimeout(() => field.current?.focus(), 250);
  };

  const send = async () => {
    if (!phone || loading) return;
    setError(null);
    setLoading(true);
    try {
      const r = await sendSignInCode(phone);
      // Signed up before with a PIN: enter it (no code). Otherwise: the code screen.
      if (r.delivery === "pin") router.push({ pathname: "/(auth)/pin", params: { phone, phoneName: r.phoneName ?? "" } });
      else router.push({ pathname: "/(auth)/verify", params: { phone, delivery: r.delivery, phoneName: r.phoneName ?? "" } });
    } catch (e: any) {
      setError(errorText(e, t("Couldn't send the code. Try again.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label={t("Back")} onPress={() => (step === "check" ? edit() : goBack("/(auth)/welcome"))} size={44} style={{ borderRadius: 14 }} />

        {step === "type" ? (
          <>
            <Txt variant="hero" style={{ marginTop: 8 }}>{t("Your phone number")}</Txt>
            <Txt color="muted">{t("Drivers and riders call each other on this number, so it has to be yours.")}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", height: 62, borderRadius: 18, borderWidth: 2, borderColor: error ? colors.danger : focused ? colors.green : colors.line, overflow: "hidden", marginTop: 6 }}>
              <View style={{ height: "100%", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.greenSoft }}>
                <Flag />
                <Txt style={{ fontFamily: fonts.display, fontSize: 16, color: colors.greenText }}>+234</Txt>
              </View>
              <TextInput
                ref={field}
                accessibilityLabel={t("Phone number")}
                value={local}
                onChangeText={(v) => { setLocal(maskLocal(v)); setError(null); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={next}
                placeholder="803 214 5567"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                autoFocus
                maxLength={12}
                style={{ flex: 1, paddingHorizontal: 14, fontFamily: fonts.display, fontSize: 18, color: colors.ink, letterSpacing: 0.3 }}
              />
            </View>
            {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
            <Button title={t("Next")} onPress={next} disabled={!phone} />
            <Txt variant="caption" color="muted" align="center">{t("By continuing you agree to {0}'s terms.", BRAND.name)}</Txt>
            {DEMO ? <Txt variant="caption" color="greenText" align="center">{t("Sample mode: tap Next to skip ahead with sample details.")}</Txt> : null}
          </>
        ) : (
          <CheckNumber phone={phone ?? ""} onEdit={edit} onContinue={send} loading={loading} error={error} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** The number on its own, big, with Edit number. Continue appears after CHECK_SECONDS. */
function CheckNumber({ phone, onEdit, onContinue, loading, error }: { phone: string; onEdit: () => void; onContinue: () => void; loading: boolean; error: string | null }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [left, setLeft] = useState(CHECK_SECONDS);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: CHECK_SECONDS * 1000, easing: Easing.linear });
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [progress]);

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const [code, ...rest] = formatNgPhone(phone).split(" "); // "+234", "803", "214", "5567"
  const ready = left === 0;
  // Big, but always the whole number on one line: "0803 214 5567" is 13 characters, and the card
  // sits inside 22 + 18 points of padding on each side. Small phones get a smaller size.
  const fontSize = Math.max(22, Math.min(34, Math.floor(((width - 80) / 13 - 1) / 0.66)));

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={{ flex: 1, gap: 16 }}>
      <Txt variant="hero" style={{ marginTop: 8 }}>{t("Is this your number?")}</Txt>
      <Txt color="muted">{t("Check every digit. We'll send your code to this number, and drivers will call you on it.")}</Txt>

      <View accessible accessibilityLabel={t("Your number: {0}", formatNgPhone(phone).split("").join(" "))}
        style={{ borderRadius: 24, backgroundColor: colors.greenSoft, paddingVertical: 26, paddingHorizontal: 18, alignItems: "center", gap: 10, marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Flag />
          <Txt variant="label" color="greenText">{code}</Txt>
        </View>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize, letterSpacing: 1, color: colors.ink }} maxFontSizeMultiplier={1} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}>
          0{rest.join(" ")}
        </Txt>
      </View>

      <Button title={t("Edit number")} variant="soft" icon="edit" onPress={onEdit} />

      {ready ? (
        <Animated.View entering={FadeIn.duration(350)} style={{ gap: 10 }}>
          {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
          <Button title={t("Yes, continue")} onPress={onContinue} loading={loading} />
        </Animated.View>
      ) : (
        <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.mist, overflow: "hidden" }}>
            <Animated.View style={[{ height: "100%", backgroundColor: colors.green }, bar]} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="time" size={16} color={colors.muted} />
            <Txt variant="caption" color="muted" tabular>{t("Take a moment to check it · {0}", String(left))}</Txt>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function Flag() {
  return (
    <View style={{ flexDirection: "row", width: 22, height: 15, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ flex: 1, backgroundColor: "#008751" }} /><View style={{ flex: 1, backgroundColor: "#FFFFFF" }} /><View style={{ flex: 1, backgroundColor: "#008751" }} />
    </View>
  );
}
