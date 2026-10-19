import { router } from "expo-router";
import React from "react";
import { Alert, Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "../../../src/components/TabBar";
import { Avatar, Plate, Segmented, SettingRow, Txt } from "../../../src/components/ui";
import { Card, Group, Tag, VehicleArt } from "../../../src/components/visual";
import { fonts } from "../../../src/theme/tokens";
import { BRAND } from "../../../src/config/brand";
import { ENV } from "../../../src/config/env";
import { formatNgPhone } from "../../../src/lib/phone";
import { useApplication } from "../../../src/driver/store/application";
import { useDriving } from "../../../src/driver/store/driving";
import { useMode } from "../../../src/store/mode";
import { useSession } from "../../../src/store/session";
import { useTheme, type ThemeMode } from "../../../src/theme/ThemeProvider";

export default function Account() {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { user, signOut } = useSession();
  const { application, resetMock } = useApplication();
  const { goOffline, trip } = useDriving();
  const { setMode: setAppMode } = useMode();
  const toRiding = () => trip
    ? Alert.alert("Finish your trip first", "You can switch to riding after this trip ends.")
    : (goOffline(), setAppMode("rider"));
  const a = application;

  const logOut = () =>
    Alert.alert("Log out?", "You'll go offline and need a code sent to your phone to log back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { goOffline(); signOut(); } },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={a?.personal.fullName ?? ""} size={68} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt variant="title" style={{ fontSize: 24 }} numberOfLines={1}>{a?.personal.fullName}</Txt>
          <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }}>{user ? formatNgPhone(user.phone) : ""}</Txt>
          <Tag text={a?.status === "suspended" ? "On hold" : "Approved driver"} tone={a?.status === "suspended" ? "red" : "green"} icon={a?.status === "suspended" ? "alert" : "check"} />
        </View>
      </View>

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

      <Card style={{ gap: 10 }}>
        <Txt variant="heading">Appearance</Txt>
        <Segmented<ThemeMode> value={mode} onChange={setMode}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Match phone" }]} />
      </Card>

      <Group>
        <SettingRow icon="keke" tone="market" title="Switch to riding" detail="Book a keke or car. You'll go offline." onPress={toRiding} />
        <SettingRow icon="ribbon" tone="green" title="Official driver record" detail={a?.recordId} onPress={() => router.push("/driver/application")} />
        <SettingRow icon="document" tone="school" title="Documents and licence" detail="Update your licence and vehicle papers" onPress={() => router.navigate("/driver/documents")} />
        <SettingRow icon="wallet" tone="gov" title="Payout account" detail={a ? `${a.bank.bankName} · ${a.bank.accountNumber}` : ""}
          onPress={() => Alert.alert("Payout account", "To change your payout account, call support. We verify bank changes to protect your earnings.")} />
      </Group>
      <Group>
        <SettingRow icon="help" tone="mosque" title="Help" detail={`Call driver support on ${BRAND.supportPhone}`} onPress={() => Linking.openURL(`tel:${BRAND.supportPhone.replace(/\s/g, "")}`)} />
        {ENV.useMock ? (
          <SettingRow icon="refresh" tone="transport" title="Start sign-up again" detail="Sample mode only: clears your sample application"
            onPress={() => Alert.alert("Start again?", "This clears your sample application so you can go through sign-up again.", [
              { text: "Cancel", style: "cancel" },
              { text: "Start again", style: "destructive", onPress: () => { goOffline(); resetMock(); } },
            ])} />
        ) : null}
        <SettingRow icon="logout" title="Log out" danger onPress={logOut} />
      </Group>
    </ScrollView>
  );
}
