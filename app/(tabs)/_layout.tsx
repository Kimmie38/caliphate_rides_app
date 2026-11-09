import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import React from "react";
import { View } from "react-native";
import { TabButton, useTabBarStyle } from "../../src/components/TabBar";
import { useTheme } from "../../src/theme/ThemeProvider";
import { t, useI18n } from "../../src/i18n";

// Custom tab bar built on Expo Router's headless tabs (expo-router/ui). Access is controlled in app/_layout.tsx.
export default function TabsLayout() {
  useI18n();
  const { colors } = useTheme();
  const barStyle = useTabBarStyle();
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1 }}>
        <TabSlot />
      </View>
      <TabList style={barStyle}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton label={t("Ride")} icon="keke" />
        </TabTrigger>
        <TabTrigger name="activity" href="/activity" asChild>
          <TabButton label={t("Activity")} icon="clock" />
        </TabTrigger>
        <TabTrigger name="wallet" href="/wallet" asChild>
          <TabButton label={t("Wallet")} icon="wallet" />
        </TabTrigger>
        <TabTrigger name="account" href="/account" asChild>
          <TabButton label={t("Account")} icon="user" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
