import { router, useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocumentRow } from "../../../src/driver/components/DocumentRow";
import { KnotMark } from "../../../src/components/Knot";
import { Card, Group, Hero, Ring } from "../../../src/components/visual";
import { fonts } from "../../../src/theme/tokens";
import { Icon } from "../../../src/components/Icon";
import { useTabBarHeight } from "../../../src/components/TabBar";
import { tap, Txt } from "../../../src/components/ui";
import { documentsFor } from "../../../src/driver/config/requirements";
import { drivingBlockers, expiringSoon, useApplication } from "../../../src/driver/store/application";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { t, useI18n } from "../../../src/i18n";

export default function Documents() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { application, refresh } = useApplication();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  if (!application?.vehicleType) return null;

  const docs = documentsFor(application.vehicleType, application.vehicle.ownsVehicle);
  const blockers = drivingBlockers(application);
  const soon = expiringSoon(application);

  const required = docs.filter((d) => d.required(application.vehicleType!, application.vehicle.ownsVehicle));
  const approved = required.filter((d) => application.documents[d.kind]?.current?.status === "approved").length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 16 }}>
      <Txt variant="page">{t("Documents")}</Txt>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Ring value={required.length ? approved / required.length : 0} size={64} label={`${approved}/${required.length}`} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 16 }}>
            {blockers.length ? t("Action needed") : soon.length ? t("Almost up to date") : t("All up to date")}
          </Txt>
          <Txt variant="caption" color="muted">
            {blockers.length
              ? t("Update the documents marked below to go online again.")
              : soon.length
                ? t("Your {0} expires in {1} day{2}.", t(soon[0].title).toLowerCase(), soon[0].days, soon[0].days === 1 ? "" : "s")
                : t("We'll remind you 30 days before anything expires.")}
          </Txt>
        </View>
      </Card>

      <Group>
        {docs.map((d) => (
          <DocumentRow key={d.kind} req={d} doc={application.documents[d.kind]} required={d.required(application.vehicleType!, application.vehicle.ownsVehicle)} />
        ))}
      </Group>

      <Pressable accessibilityRole="button" onPress={() => { tap(); router.push("/driver/application"); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Hero style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22 }}>
          <KnotMark size={34} color="#FFFFFF" strokeWidth={9} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 15, color: "#FFFFFF" }}>{t("Official driver record")}</Txt>
            <Txt variant="caption" style={{ color: "#FFFFFF", opacity: 0.85 }}>{t("{0} · every version and review", application.recordId)}</Txt>
          </View>
          <Icon name="forward" size={18} color="#FFFFFF" />
        </Hero>
      </Pressable>
    </ScrollView>
  );
}
