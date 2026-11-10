import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmailCodeFlow } from "../../src/components/EmailCodeFlow";
import { IconButton, Txt } from "../../src/components/ui";
import { t, useI18n } from "../../src/i18n";
import { goBack } from "../../src/lib/nav";
import { requestEmailCode, verifyEmailCode } from "../../src/services/auth";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";

/** Sign in with a code sent by email: free. New accounts add their phone number next. */
export default function EmailSignIn() {
  const { lang } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack("/(auth)/welcome")} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="hero" style={{ marginTop: 8 }}>{t("Continue with email")}</Txt>
        <Txt color="muted">{t("Use the same email each time you sign in.")}</Txt>
        <EmailCodeFlow
          request={(email) => requestEmailCode(email, lang)}
          verify={async (email, code) => { const r = await verifyEmailCode(email, code); await signIn(r.token, r.user); }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
