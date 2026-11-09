import Constants from "expo-constants";
import React from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { IconButton, Segmented, SettingRow, tap, Txt } from "../components/ui";
import { Card, Group } from "../components/visual";
import { BRAND } from "../config/brand";
import { LANGS, t, useI18n, type Lang } from "../i18n";
import { goBack } from "../lib/nav";
import { useTheme, type ThemeMode } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";

/** A phrase in each language, so people who can't read one of them still recognise their own. */
const SAMPLE: Record<Lang, { greeting: string; line: string }> = {
  en: { greeting: "Hello", line: "Book a keke or car around Sokoto" },
  ha: { greeting: "Sannu", line: "Yi odar keke ko mota a cikin Sokoto" },
};

/** Settings for riders and drivers: language, appearance, and about the app. */
export function SettingsScreen({ who, back }: { who: "rider" | "driver"; back: "/(tabs)/account" | "/driver/account" }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();
  const version = Constants.expoConfig?.version ?? "";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton name="back" label={t("Back")} onPress={() => goBack(back)} size={44} style={{ borderRadius: 14 }} />
        <Txt variant="page" style={{ flex: 1 }}>{t("Settings")}</Txt>
      </View>

      {/* Language */}
      <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="language" size={20} color={colors.greenText} />
          <Txt variant="heading">{t("Language")}</Txt>
          <Txt variant="caption" color="muted">· Harshe</Txt>
        </View>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12 }}>
          {LANGS.map((l) => {
            const on = l.value === lang;
            return (
              <Pressable
                key={l.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.native}
                onPress={() => { tap(); setLang(l.value); }}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: 22, padding: 16, gap: 10, borderWidth: 2,
                  borderColor: on ? colors.green : colors.line, backgroundColor: on ? colors.greenSoft : colors.paper,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: on ? colors.green : colors.mist, alignItems: "center", justifyContent: "center" }}>
                    <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 16, color: on ? colors.greenInk : colors.ink }}>{l.value === "en" ? "EN" : "HA"}</Txt>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.green : colors.line, backgroundColor: on ? colors.green : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on ? <Icon name="checkmark" size={14} color={colors.greenInk} /> : null}
                  </View>
                </View>
                <View style={{ gap: 2 }}>
                  <Txt style={{ fontFamily: fonts.display, fontSize: 18 }}>{l.native}</Txt>
                  <Txt variant="caption" color="muted" numberOfLines={2}>{SAMPLE[l.value].greeting}! {SAMPLE[l.value].line}</Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Txt variant="caption" color="muted">{t("The app remembers your choice, even after you close it.")}</Txt>
      </Animated.View>

      {/* Appearance */}
      <Animated.View entering={FadeInDown.duration(350).delay(60)}>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="moon" size={20} color={colors.greenText} />
            <Txt variant="heading">{t("Appearance")}</Txt>
          </View>
          <Segmented<ThemeMode>
            value={mode}
            onChange={setMode}
            options={[{ value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }, { value: "system", label: t("Match phone") }]}
          />
        </Card>
      </Animated.View>

      {/* About */}
      <Animated.View entering={FadeInDown.duration(350).delay(120)} style={{ gap: 10 }}>
        <Txt variant="heading">{t("About")}</Txt>
        <Group>
          <SettingRow icon="help" tone="mosque" title={who === "driver" ? t("Driver support") : t("Help and support")} detail={BRAND.supportPhone}
            onPress={() => Linking.openURL(`tel:${BRAND.supportPhone.replace(/\s/g, "")}`)} />
          <SettingRow icon="shield" tone="green" title={t("Your data")} detail={t("Kept private. Only Caliphate Rides staff can see it.")} />
          <SettingRow icon="info" tone="school" title={BRAND.name} detail={t("Version {0}", version)} />
        </Group>
      </Animated.View>
    </ScrollView>
  );
}
