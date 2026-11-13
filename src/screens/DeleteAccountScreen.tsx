import React, { useEffect, useState } from "react";
import { appAlert } from "../components/AppAlert";
import { errorText } from "../services/http";
import { Platform, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../components/Icon";
import { Button, IconButton, Txt } from "../components/ui";
import { Card } from "../components/visual";
import { BRAND } from "../config/brand";
import { t, useI18n } from "../i18n";
import { goBack } from "../lib/nav";
import { formatNaira } from "../lib/pricing";
import { deleteAccount } from "../services/auth";
import { getWallet } from "../services/rides";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Deleting the account from inside the app (Apple's App Store and Google Play both require it).
 * The server refuses, with a clear reason, while a trip or money still needs settling.
 */
export function DeleteAccountScreen({ back, beforeSignOut }: { back: "/settings" | "/driver/settings"; beforeSignOut?: () => void }) {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useSession();
  const [wallet, setWallet] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getWallet().then((w) => setWallet(w.balance)).catch(() => {}); }, []);

  const remove = async () => {
    setBusy(true); setError(null);
    try {
      await deleteAccount();
      beforeSignOut?.();
      await signOut(); // the app returns to the welcome screen by itself
    } catch (e: any) {
      setError(errorText(e, t("Couldn't delete your account. Check your connection and try again.")));
      setBusy(false);
    }
  };

  const confirm = () => {
    const title = t("Delete your account?");
    const message = t("This can't be undone.");
    appAlert(title, message, [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Delete my account"), style: "destructive", onPress: remove },
    ], { icon: "alert" });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack(back)} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="page" style={{ flex: 1 }}>{t("Delete account")}</Txt>
      </View>

      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 14 }}>
        <Card style={{ gap: 12 }}>
          <Txt variant="heading">{t("What we delete")}</Txt>
          <Point icon="person" text={t("Your name and phone number")} />
          <Point icon="idcard" text={t("If you drive: your ID number, address, guarantor, bank details and document photos")} />
          <Point icon="logout" text={t("You're signed out on every phone")} />
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="heading">{t("What we keep")}</Txt>
          <Point icon="receipt" text={t("Records of past trips and payments, without your contact details. The law and our accounts need them.")} />
          <Point icon="phone" text={t("You can sign up again with the same number at any time, as a new account.")} />
        </Card>

        {wallet > 0 ? (
          <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.dangerSoft }}>
            <Icon name="wallet" size={22} color={colors.danger} />
            <Txt style={{ flex: 1, color: colors.danger }}>
              {t("You have {0} in your wallet. It will be lost. Use it on a ride first, or call {1} to ask about it.", formatNaira(wallet), BRAND.supportPhone)}
            </Txt>
          </View>
        ) : null}

        <Txt variant="caption" color="muted">{t("Drivers: withdraw your balance and finish any trip first. We'll tell you if anything is left to settle.")}</Txt>

        {error ? (
          <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.dangerSoft }} accessibilityLiveRegion="polite">
            <Icon name="alert" size={20} color={colors.danger} />
            <Txt style={{ flex: 1, color: colors.danger }}>{error}</Txt>
          </View>
        ) : null}

        <Button title={t("Delete my account")} variant="danger" icon="close" onPress={confirm} loading={busy} />
        <Button title={t("Keep my account")} variant="quiet" onPress={() => goBack(back)} />
      </Animated.View>
    </ScrollView>
  );
}

function Point({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={17} color={colors.ink} />
      </View>
      <Txt style={{ flex: 1, paddingTop: 5 }}>{text}</Txt>
    </View>
  );
}
