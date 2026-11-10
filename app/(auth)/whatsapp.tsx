import React, { useCallback } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Txt } from "../../src/components/ui";
import { WhatsAppConfirm } from "../../src/components/WhatsAppConfirm";
import { t, useI18n } from "../../src/i18n";
import { goBack } from "../../src/lib/nav";
import { checkWhatsApp, startWhatsApp } from "../../src/services/auth";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";

/** Sign in by sending a code from WhatsApp: free for everyone. */
export default function WhatsAppSignIn() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const onConfirmed = useCallback(async (r: { token: string; user: any }) => {
    // Signing in opens the next screen by itself (name for new people, otherwise home).
    await signIn(r.token, r.user);
  }, [signIn]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <IconButton name="back" label={t("Back")} onPress={() => goBack("/(auth)/welcome")} size={44} style={{ borderRadius: 14 }} />
      <Txt variant="hero" style={{ marginTop: 8 }}>{t("Continue with WhatsApp")}</Txt>
      <Txt color="muted">{t("Send this code to Caliphate Rides on WhatsApp. Your WhatsApp number becomes your account.")}</Txt>
      <WhatsAppConfirm start={startWhatsApp} check={checkWhatsApp} onConfirmed={onConfirmed} />
    </ScrollView>
  );
}
