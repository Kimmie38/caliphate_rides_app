import { router } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../src/components/Logo";
import { Button, tap, Txt } from "../../src/components/ui";
import { Hero } from "../../src/components/visual";
import { BRAND } from "../../src/config/brand";
import { Icon } from "../../src/components/Icon";
import { takeCodeTappedWhileClosed } from "../../src/lib/codeNotice";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts, radius } from "../../src/theme/tokens";
import { t, useI18n } from "../../src/i18n";

/** English / Hausa switch on the welcome screen, before anyone has signed in. */
function LanguagePill({ top }: { top: number }) {
  const { lang, setLang } = useI18n();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("Language")} style={{ position: "absolute", top, right: 16, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 999, padding: 4, gap: 2 }}>
      {(["en", "ha"] as const).map((l) => {
        const on = lang === l;
        return (
          <Pressable key={l} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={l === "en" ? "English" : "Hausa"}
            onPress={() => { tap(); setLang(l); }} hitSlop={6}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? "#FFFFFF" : "transparent" }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 13, color: on ? "#00753F" : "#FFFFFF" }}>{l === "en" ? "English" : "Hausa"}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The way in: an icon, a title and a line under it. */
function Choice({ icon, title, detail, onPress, primary }: { icon: "phone"; title: string; detail: string; onPress: () => void; primary?: boolean }) {
  const { colors } = useTheme();
  const bg = primary ? colors.green : colors.paper;
  const fg = primary ? "#FFFFFF" : colors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 20, backgroundColor: bg, borderWidth: primary ? 0 : 2, borderColor: colors.line, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: primary ? "rgba(255,255,255,0.22)" : colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={24} color={primary ? "#FFFFFF" : colors.greenText} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.display, fontSize: 17, color: fg }}>{title}</Txt>
        <Txt variant="caption" style={{ color: fg, opacity: primary ? 0.9 : 0.65 }}>{detail}</Txt>
      </View>
      <Icon name="forward" size={20} color={primary ? "#FFFFFF" : colors.muted} />
    </Pressable>
  );
}

export default function Welcome() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Opened by tapping a sign-in code after the phone had closed the app: carry on where they were.
  useEffect(() => {
    takeCodeTappedWhileClosed().then((c) => {
      if (c) router.push({ pathname: "/(auth)/verify", params: { phone: c.phone, delivery: "app", code: c.code } });
    });
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
      {/* Brand hero */}
      <Hero style={{ borderRadius: 0, minHeight: 400, paddingTop: insets.top + 24, paddingBottom: 64, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <Logo size={160} style={{ shadowColor: "#00301B", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }} />
        </Animated.View>
        <Txt style={{ color: "#FFFFFF", opacity: 0.9, fontFamily: fonts.bodySemi }}>{t("Keke and car rides in Sokoto, Kano, Kaduna, Abuja and Jos")}</Txt>
        <LanguagePill top={insets.top + 12} />
      </Hero>

      {/* Sign-in card overlapping the hero */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}
        style={{ flex: 1, marginTop: -36, backgroundColor: colors.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 22, paddingTop: 28, paddingBottom: insets.bottom + 20, gap: 14 }}>
        <Txt variant="hero" style={{ fontSize: 28, lineHeight: 32 }}>{t("Welcome")}</Txt>
        <Txt color="muted" style={{ marginTop: -6 }}>{t("Book a ride, or sign up to drive your own keke or car.")}</Txt>

        <View style={{ marginTop: 4 }}>
          <Choice primary icon="phone" title={t("Continue with your phone number")} detail={t("We send you a 6-digit code.")} onPress={() => router.push("/(auth)/phone")} />
        </View>
        <Txt variant="caption" color="muted" align="center">{t("By continuing you agree to {0}'s terms.", BRAND.name)}</Txt>
      </Animated.View>
    </ScrollView>
  );
}
