import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import React from "react";
import { View } from "react-native";
import { TabButton, useTabBarStyle } from "../../../src/components/TabBar";
import { useApplication } from "../../../src/driver/store/application";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function TabsLayout() {
  const { colors } = useTheme();
  const barStyle = useTabBarStyle();
  const { application } = useApplication();
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1 }}>
        <TabSlot />
      </View>
      <TabList style={barStyle}>
        <TabTrigger name="index" href="/driver" asChild>
          <TabButton label="Drive" icon={application?.vehicleType === "car" ? "car" : "keke"} />
        </TabTrigger>
        <TabTrigger name="earnings" href="/driver/earnings" asChild>
          <TabButton label="Earnings" icon="cash" />
        </TabTrigger>
        <TabTrigger name="documents" href="/driver/documents" asChild>
          <TabButton label="Documents" icon="document" />
        </TabTrigger>
        <TabTrigger name="account" href="/driver/account" asChild>
          <TabButton label="Account" icon="user" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
