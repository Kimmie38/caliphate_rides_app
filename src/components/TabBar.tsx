import React from "react";
import { Pressable, type View } from "react-native";
import type { TabTriggerSlotProps } from "expo-router/ui";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { glow, shadow } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";
import { tap, Txt } from "./ui";

const BAR = 68;
const GAP = 10;

/** Space to leave at the bottom of a screen so content clears the floating tab bar. */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return BAR + Math.max(insets.bottom, GAP) + GAP;
}

/** The bar: a floating frosted pill (applied to <TabList>). */
export function useTabBarStyle() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return {
    position: "absolute" as const, left: 16, right: 16, bottom: Math.max(insets.bottom, GAP),
    height: BAR, borderRadius: BAR / 2, paddingHorizontal: 8,
    flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassLine,
    ...shadow(2, isDark),
  };
}

type Props = TabTriggerSlotProps & { label: string; icon: IconName; ref?: React.Ref<View> };

/** One tab. The active one grows into a green capsule with its label. */
export function TabButton({ label, icon, isFocused, onPress, ...rest }: Props) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      onPress={(e) => { if (!isFocused) tap(); onPress?.(e); }}
      style={{ height: 52, justifyContent: "center" }}
    >
      <Animated.View
        layout={LinearTransition.duration(220)}
        style={[
          { height: 52, minWidth: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: isFocused ? 18 : 0 },
          isFocused && { backgroundColor: colors.green, ...glow(isDark) },
        ]}
      >
        <Icon name={icon} size={24} color={isFocused ? colors.greenInk : colors.muted} />
        {isFocused ? <Txt variant="label" style={{ color: colors.greenInk, fontSize: 13 }}>{label}</Txt> : null}
      </Animated.View>
    </Pressable>
  );
}
