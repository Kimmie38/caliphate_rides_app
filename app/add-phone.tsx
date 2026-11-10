import React, { useCallback } from "react";
import { Alert, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "../src/components/visual";
import { Txt } from "../src/components/ui";
import { WhatsAppConfirm } from "../src/components/WhatsAppConfirm";
import { t, useI18n } from "../src/i18n";
import { checkPhoneLink, startPhoneLink, type WhatsAppStart } from "../src/services/auth";
import { useSession } from "../src/store/session";
import { useTheme } from "../src/theme/ThemeProvider";

/**
 * People who signed in by email add their phone number once, with WhatsApp, before booking or
 * driving: riders and drivers call each other at pickup. Opens by itself until it's done.
 */
export default function AddPhone() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser, signOut } = useSession();
  const check = useCallback((s: WhatsAppStart) => checkPhoneLink(s, user!), [user]);
  const onConfirmed = useCallback(async (r: { user: any }) => { await updateUser(r.user); }, [updateUser]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <Badge icon="phone" tone="green" size={56} />
      <Txt variant="hero">{t("Add your phone number")}</Txt>
      <Txt color="muted">{t("Drivers and riders call each other at pickup. Confirm your number by sending a code from WhatsApp: it's free.")}</Txt>
      <WhatsAppConfirm start={startPhoneLink} check={check} onConfirmed={onConfirmed} />
      <Pressable accessibilityRole="button" hitSlop={8} style={{ alignSelf: "center", paddingVertical: 8 }}
        onPress={() => Alert.alert(t("Log out?"), t("You can sign in again with WhatsApp or email."), [
          { text: t("Cancel"), style: "cancel" },
          { text: t("Log out"), style: "destructive", onPress: signOut },
        ])}>
        <Txt variant="label" color="muted">{t("Log out")}</Txt>
      </Pressable>
    </ScrollView>
  );
}
