import React from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../src/components/Icon";
import { KnotTile } from "../src/components/Knot";
import { tap, Txt } from "../src/components/ui";
import { CarArt, Hero, KekeArt } from "../src/components/visual";
import { useMode, type Mode } from "../src/store/mode";
import { useSession } from "../src/store/session";
import { useTheme } from "../src/theme/ThemeProvider";
import { fonts, shadow } from "../src/theme/tokens";

/** First time only: ride or drive. Switch any time from Account. */
export default function Start() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { setMode } = useMode();
  const first = user?.name.split(" ")[0] ?? "";

  const choose = (m: Mode) => { tap(); setMode(m); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + 28, paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 16 }}>
      <KnotTile size={52} />
      <Txt variant="hero" style={{ marginTop: 8 }}>Sannu, {first}. How do you want to use Caliphate Rides?</Txt>

      <Animated.View entering={FadeInDown.duration(450).delay(100)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ride. Book a keke or car around Sokoto." onPress={() => choose("rider")}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <View style={{ backgroundColor: colors.paper, borderRadius: 28, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: isDark ? 1 : 0, borderColor: colors.line, ...shadow(2, isDark) }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt variant="title" style={{ fontSize: 24 }}>Ride</Txt>
              <Txt color="muted">Book a keke or car around Sokoto and track it live.</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Txt variant="label" color="greenText">Start riding</Txt><Icon name="arrow" size={16} color={colors.greenText} />
              </View>
            </View>
            <KekeArt width={118} />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(450).delay(220)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Drive. Sign up with your keke or car and earn." onPress={() => choose("driver")}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Hero glowing style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt style={{ fontFamily: fonts.display, fontSize: 24, color: "#FFFFFF" }}>Drive</Txt>
              <Txt style={{ color: "#FFFFFF", opacity: 0.88 }}>Sign up with your keke or car and earn on your own time.</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Txt variant="label" style={{ color: "#FFFFFF" }}>Become a driver</Txt><Icon name="arrow" size={16} color="#FFFFFF" />
              </View>
            </View>
            <CarArt width={118} />
          </Hero>
        </Pressable>
      </Animated.View>

      <View style={{ flex: 1 }} />
      <Txt variant="caption" color="muted" align="center">You can switch between riding and driving any time from Account.</Txt>
    </View>
  );
}
