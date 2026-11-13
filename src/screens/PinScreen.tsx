import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CodeInput } from "../components/CodeInput";
import { Icon } from "../components/Icon";
import { IconButton, Txt } from "../components/ui";
import { t, useI18n } from "../i18n";
import { goBack } from "../lib/nav";
import { pinMessage } from "../lib/pinErrors";
import { setPin } from "../services/auth";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";

type Step = "current" | "new" | "confirm";

/**
 * Creating the 4-digit sign-in PIN (straight after the first sign-in, or after "Forgot PIN"), or
 * changing it from Settings (then the current PIN comes first). Typed twice so a slip can't lock
 * someone out.
 */
export function PinScreen({ mode, back, onDone }: { mode: "create" | "change"; back?: "/settings" | "/driver/settings"; onDone?: () => void }) {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useSession();
  const [step, setStep] = useState<Step>(mode === "change" ? "current" : "new");
  const [current, setCurrent] = useState("");
  const [first, setFirst] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const title = step === "current" ? t("Enter your current PIN") : step === "new" ? (mode === "change" ? t("Choose a new PIN") : t("Create your sign-in PIN")) : t("Type it again");
  const hint = step === "current" ? t("To change your PIN, first enter the one you use now.")
    : step === "new" ? t("4 digits. You'll use it to sign in again: after logging out, reinstalling the app, or on a new phone. Never share it, not even with Caliphate Rides staff.")
    : t("Enter the same 4 digits to make sure.");

  const next = async (v: string) => {
    setError(null);
    if (step === "current") { setCurrent(v); setValue(""); return setStep("new"); }
    if (step === "new") { setFirst(v); setValue(""); return setStep("confirm"); }
    if (v !== first) {
      setValue(""); setFirst(""); setStep("new");
      return setError(t("The two PINs didn't match. Choose your PIN again."));
    }
    if (!user || busy) return;
    setBusy(true);
    try {
      const updated = await setPin(v, user, mode === "change" ? current : undefined);
      if (mode === "change") { setDone(true); setTimeout(() => (onDone ? onDone() : back && goBack(back)), 1200); }
      await updateUser(updated); // creating: the app moves on by itself once the PIN exists
    } catch (e: any) {
      setValue(""); setFirst("");
      setStep(e?.code === "wrong_pin" ? "current" : "new");
      if (e?.code === "wrong_pin") setCurrent("");
      setError(pinMessage(e, t("Couldn't save your PIN. Check your connection and try again.")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {mode === "change" && back ? <IconButton name="back" label={t("Back")} onPress={() => goBack(back)} size={44} style={{ borderRadius: 14 }} /> : null}
        {mode === "create" ? (
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
            <Icon name="lock" size={28} color={colors.greenText} />
          </View>
        ) : null}
        <Animated.View key={step} entering={FadeInDown.duration(250)} style={{ gap: 10 }}>
          <Txt variant="hero">{done ? t("PIN changed") : title}</Txt>
          <Txt color="muted">{done ? t("Use your new PIN next time you sign in.") : hint}</Txt>
        </Animated.View>
        {!done ? (
          <View style={{ marginTop: 10 }} key={`input-${step}`}>
            <CodeInput value={value} onChange={(v) => { setValue(v); setError(null); }} onComplete={next} length={4} secret label={title} />
          </View>
        ) : null}
        {error ? <Txt variant="caption" style={{ color: colors.danger }} accessibilityLiveRegion="polite">{error}</Txt> : null}
        {busy ? <Txt variant="caption" color="muted">{t("Saving…")}</Txt> : null}
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 6 }}>
          {(mode === "change" ? ["current", "new", "confirm"] : ["new", "confirm"]).map((s) => (
            <View key={s} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s === step || done ? colors.green : colors.line }} />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
