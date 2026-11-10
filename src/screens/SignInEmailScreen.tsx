import { router } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmailCodeFlow } from "../components/EmailCodeFlow";
import { IconButton, Txt } from "../components/ui";
import { t, useI18n } from "../i18n";
import { goBack } from "../lib/nav";
import { requestSignInEmail, verifySignInEmail } from "../services/auth";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";

/** Add (or change) the email someone can sign in with, as well as WhatsApp. Confirmed with a code. */
export function SignInEmailScreen({ back }: { back: "/profile" | "/driver/profile" }) {
  const { lang } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useSession();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack(back)} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="hero" style={{ marginTop: 8 }}>{user?.signInEmail ? t("Change sign-in email") : t("Add a sign-in email")}</Txt>
        <Txt color="muted">{t("Then you can also sign in with a code by email, for example on a new phone.")}</Txt>
        <EmailCodeFlow
          initialEmail={user?.signInEmail || user?.email || ""}
          submitLabel={t("Save email")}
          request={(email) => requestSignInEmail(email, lang)}
          verify={async (email, code) => {
            const next = await verifySignInEmail(email, code, user!);
            await updateUser(next);
            router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
