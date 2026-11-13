import { router } from "expo-router";
import { appAlert } from "../../src/components/AppAlert";
import React from "react";
import { Linking, Pressable, ScrollView, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "../../src/components/TabBar";
import { Avatar, SettingRow, tap, Txt } from "../../src/components/ui";
import { CarArt, Group, Hero, Tag } from "../../src/components/visual";
import { fonts } from "../../src/theme/tokens";
import { BRAND } from "../../src/config/brand";
import { ENV } from "../../src/config/env";
import { formatNgPhone } from "../../src/lib/phone";
import { useMode } from "../../src/store/mode";
import { useRide } from "../../src/store/ride";
import { useSavedPlaces } from "../../src/store/saved";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";
import { t, useI18n } from "../../src/i18n";

export default function Account() {
  const { lang } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { user, signOut } = useSession();
  const { saved } = useSavedPlaces();
  const { setMode: setAppMode } = useMode();
  const { activeRide } = useRide();
  const rideOpen = !!activeRide && !["completed", "cancelled", "no_drivers"].includes(activeRide.status);
  const toDriving = () => rideOpen
    ? appAlert(t("Finish your ride first"), t("You can switch to driving after your current ride ends."))
    : setAppMode("driver");

  // The web preview has no dialogs, so it logs out straight away there.
  const logOut = () =>
    appAlert(t("Log out?"), t("You'll need your 4-digit PIN to log back in."), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Log out"), style: "destructive", onPress: () => { signOut(); } },
    ], { icon: "logout" });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 18 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Edit profile")} onPress={() => { tap(); router.push("/profile"); }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.8 : 1 })}>
        <Avatar name={user?.name ?? ""} size={68} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt variant="title" style={{ fontSize: 24 }} numberOfLines={1}>{user?.name}</Txt>
          <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }}>{user ? formatNgPhone(user.phone) : ""}</Txt>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {user?.rating ? <Tag text={t("★ {0} rider", user.rating.toFixed(1))} tone="amber" /> : null}
            <Tag text={t("Edit profile")} tone="green" icon="edit" />
          </View>
        </View>
      </Pressable>

      {/* Become a driver */}
      <Pressable accessibilityRole="button" accessibilityLabel={t("Drive with Caliphate Rides")} onPress={() => { tap(); toDriving(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Hero glowing style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 17, color: "#FFFFFF" }}>{t("Drive with Caliphate Rides")}</Txt>
            <Txt style={{ color: "#FFFFFF", opacity: 0.85, fontSize: 13, fontFamily: fonts.bodySemi }}>{t("Earn with your keke or car")}</Txt>
            <View style={{ alignSelf: "flex-start", marginTop: 10, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Txt style={{ fontFamily: fonts.display, fontSize: 13, color: "#00753F" }}>{t("Start driving")}</Txt>
            </View>
          </View>
          <CarArt width={112} />
        </Hero>
      </Pressable>

      <Group>
        <SettingRow icon="home" title={t("Home")} tone="green" detail={saved.home?.name ?? t("Set your home address")} onPress={() => router.push({ pathname: "/ride/search", params: { saveAs: "home" } })} />
        <SettingRow icon="work" title={t("Work")} tone="gov" detail={saved.work?.name ?? t("Set your work address")} onPress={() => router.push({ pathname: "/ride/search", params: { saveAs: "work" } })} />
        <SettingRow icon="user" title={t("Profile")} tone="green" detail={t("Name and phone number")} onPress={() => router.push("/profile")} />
        <SettingRow icon="settings" title={t("Settings")} tone="school" detail={t("Language: {0} · Appearance", lang === "ha" ? "Hausa" : "English")} onPress={() => router.push("/settings")} />
        <SettingRow icon="people" title={t("Trusted contacts")} tone="health" detail={t("Family who can follow your trips live")} onPress={() => appAlert(t("Trusted contacts"), t("Adding contacts arrives with the backend. For now, use Share trip during a ride."))} />
      </Group>
      <Group>
        <SettingRow icon="help" title={t("Help")} tone="mosque" detail={t("Call support on {0}", BRAND.supportPhone)} onPress={() => Linking.openURL(`tel:${BRAND.supportPhone.replace(/\s/g, "")}`)} />
        <SettingRow icon="logout" title={t("Log out")} danger onPress={logOut} />
      </Group>

      {ENV.useMock ? <Txt variant="caption" color="muted" align="center">{t("Sample mode · not connected to the server")}</Txt> : null}
    </ScrollView>
  );
}
