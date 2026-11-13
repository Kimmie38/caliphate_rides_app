import { router } from "expo-router";
import React from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "../../../src/components/TabBar";
import { Avatar, Plate, SettingRow, tap, Txt } from "../../../src/components/ui";
import { Card, Group, Tag, VehicleArt } from "../../../src/components/visual";
import { fonts } from "../../../src/theme/tokens";
import { BRAND } from "../../../src/config/brand";
import { ENV } from "../../../src/config/env";
import { formatNgPhone } from "../../../src/lib/phone";
import { useApplication } from "../../../src/driver/store/application";
import { useDriving } from "../../../src/driver/store/driving";
import { useMode } from "../../../src/store/mode";
import { useSession } from "../../../src/store/session";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { t, useI18n } from "../../../src/i18n";

export default function Account() {
  const { lang } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { user, signOut } = useSession();
  const { application, resetMock } = useApplication();
  const { goOffline, trip } = useDriving();
  const { setMode: setAppMode } = useMode();
  const toRiding = () => trip
    ? Alert.alert(t("Finish your trip first"), t("You can switch to riding after this trip ends."))
    : (goOffline(), setAppMode("rider"));
  const a = application;

  const logOut = () =>
    Alert.alert(t("Log out?"), t("You'll go offline and need your 4-digit PIN to log back in."), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Log out"), style: "destructive", onPress: () => { goOffline(); signOut(); } },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 18 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Open your profile")} onPress={() => { tap(); router.push("/driver/profile"); }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.8 : 1 })}>
        <Avatar name={a?.personal.fullName ?? ""} size={68} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt variant="title" style={{ fontSize: 24 }} numberOfLines={1}>{a?.personal.fullName}</Txt>
          <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }}>{user ? formatNgPhone(user.phone) : ""}</Txt>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <Tag text={a?.status === "suspended" ? t("On hold") : t("Approved driver")} tone={a?.status === "suspended" ? "red" : "green"} icon={a?.status === "suspended" ? "alert" : "check"} />
            <Tag text={t("View profile")} tone="neutral" icon="user" />
          </View>
        </View>
      </Pressable>

      {a?.vehicleType ? (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 92, height: 64, borderRadius: 16, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
            <VehicleArt type={a.vehicleType} width={82} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} numberOfLines={1}>{[a.vehicle.colour, a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ")}</Txt>
            <View style={{ alignSelf: "flex-start" }}><Plate text={a.vehicle.plate} /></View>
          </View>
        </Card>
      ) : null}

      <Group>
        <SettingRow icon="user" tone="green" title={t("Profile")} detail={t("Your details, vehicle and record")} onPress={() => router.push("/driver/profile")} />
        <SettingRow icon="settings" tone="school" title={t("Settings")} detail={t("Language: {0} · Appearance", lang === "ha" ? "Hausa" : "English")} onPress={() => router.push("/driver/settings")} />
      </Group>
      <Group>
        <SettingRow icon="keke" tone="market" title={t("Switch to riding")} detail={t("Book a keke or car. You'll go offline.")} onPress={toRiding} />
        <SettingRow icon="ribbon" tone="green" title={t("Official driver record")} detail={a?.recordId} onPress={() => router.push("/driver/application")} />
        <SettingRow icon="document" tone="school" title={t("Documents and licence")} detail={t("Update your licence and vehicle papers")} onPress={() => router.navigate("/driver/documents")} />
        <SettingRow icon="wallet" tone="gov" title={t("Payout account")} detail={a ? `${a.bank.bankName} · ${a.bank.accountNumber}` : ""}
          onPress={() => Alert.alert(t("Payout account"), t("To change your payout account, call support. We verify bank changes to protect your earnings."))} />
      </Group>
      <Group>
        <SettingRow icon="help" tone="mosque" title={t("Help")} detail={t("Call driver support on {0}", BRAND.supportPhone)} onPress={() => Linking.openURL(`tel:${BRAND.supportPhone.replace(/\s/g, "")}`)} />
        {ENV.useMock ? (
          <SettingRow icon="refresh" tone="transport" title={t("Start sign-up again")} detail={t("Sample mode only: clears your sample application")}
            onPress={() => Alert.alert(t("Start again?"), t("This clears your sample application so you can go through sign-up again."), [
              { text: t("Cancel"), style: "cancel" },
              { text: t("Start again"), style: "destructive", onPress: () => { goOffline(); resetMock(); } },
            ])} />
        ) : null}
        <SettingRow icon="logout" title={t("Log out")} danger onPress={logOut} />
      </Group>
    </ScrollView>
  );
}
