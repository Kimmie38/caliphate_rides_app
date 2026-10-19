import { router } from "expo-router";
import React from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "../../src/components/TabBar";
import { Avatar, Segmented, SettingRow, tap, Txt } from "../../src/components/ui";
import { CarArt, Card, Group, Hero, Tag } from "../../src/components/visual";
import { fonts } from "../../src/theme/tokens";
import { BRAND } from "../../src/config/brand";
import { ENV } from "../../src/config/env";
import { formatNgPhone } from "../../src/lib/phone";
import { useMode } from "../../src/store/mode";
import { useRide } from "../../src/store/ride";
import { useSavedPlaces } from "../../src/store/saved";
import { useSession } from "../../src/store/session";
import { useTheme, type ThemeMode } from "../../src/theme/ThemeProvider";

export default function Account() {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { user, signOut } = useSession();
  const { saved } = useSavedPlaces();
  const { setMode: setAppMode } = useMode();
  const { activeRide } = useRide();
  const rideOpen = !!activeRide && !["completed", "cancelled", "no_drivers"].includes(activeRide.status);
  const toDriving = () => rideOpen
    ? Alert.alert("Finish your ride first", "You can switch to driving after your current ride ends.")
    : setAppMode("driver");

  const logOut = () =>
    Alert.alert("Log out?", "You'll need a code sent to your phone to log back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { signOut(); } },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={user?.name ?? ""} size={68} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt variant="title" style={{ fontSize: 24 }} numberOfLines={1}>{user?.name}</Txt>
          <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }}>{user ? formatNgPhone(user.phone) : ""}</Txt>
          {user?.rating ? <Tag text={`★ ${user.rating.toFixed(1)} rider`} tone="amber" /> : null}
        </View>
      </View>

      {/* Become a driver */}
      <Pressable accessibilityRole="button" accessibilityLabel="Drive with Caliphate Rides" onPress={() => { tap(); toDriving(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Hero glowing style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 17, color: "#FFFFFF" }}>Drive with Caliphate Rides</Txt>
            <Txt style={{ color: "#FFFFFF", opacity: 0.85, fontSize: 13, fontFamily: fonts.bodySemi }}>Earn with your keke or car</Txt>
            <View style={{ alignSelf: "flex-start", marginTop: 10, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Txt style={{ fontFamily: fonts.display, fontSize: 13, color: "#00753F" }}>Start driving</Txt>
            </View>
          </View>
          <CarArt width={112} />
        </Hero>
      </Pressable>

      <Card style={{ gap: 10 }}>
        <Txt variant="heading">Appearance</Txt>
        <Segmented<ThemeMode>
          value={mode}
          onChange={setMode}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Match phone" }]}
        />
      </Card>

      <Group>
        <SettingRow icon="home" title="Home" tone="green" detail={saved.home?.name ?? "Set your home address"} onPress={() => router.push({ pathname: "/ride/search", params: { saveAs: "home" } })} />
        <SettingRow icon="work" title="Work" tone="gov" detail={saved.work?.name ?? "Set your work address"} onPress={() => router.push({ pathname: "/ride/search", params: { saveAs: "work" } })} />
        <SettingRow icon="globe" title="Language" tone="school" detail="English" onPress={() => Alert.alert("Language", "Hausa is coming in the next update.")} />
        <SettingRow icon="people" title="Trusted contacts" tone="health" detail="Family who can follow your trips live" onPress={() => Alert.alert("Trusted contacts", "Adding contacts arrives with the backend. For now, use Share trip during a ride.")} />
      </Group>
      <Group>
        <SettingRow icon="help" title="Help" tone="mosque" detail={`Call support on ${BRAND.supportPhone}`} onPress={() => Linking.openURL(`tel:${BRAND.supportPhone.replace(/\s/g, "")}`)} />
        <SettingRow icon="logout" title="Log out" danger onPress={logOut} />
      </Group>

      {ENV.useMock ? <Txt variant="caption" color="muted" align="center">Sample mode · not connected to the server</Txt> : null}
    </ScrollView>
  );
}
