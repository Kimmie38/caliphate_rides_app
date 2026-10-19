import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextProps, type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { tint, type TintName } from "../theme/tints";
import { fonts, glow, radius, shadow, type, type Palette, type TypeVariant } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";

export const tap = () => Haptics.selectionAsync().catch(() => {});

// ---------- Text ----------
type TxtProps = TextProps & { variant?: TypeVariant; color?: keyof Palette; align?: "left" | "center" | "right"; tabular?: boolean };
export function Txt({ variant = "body", color = "ink", align, tabular, style, ...rest }: TxtProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.35}
      {...rest}
      style={[type[variant], { color: colors[color] }, align && { textAlign: align }, tabular && { fontVariant: ["tabular-nums"] }, style]}
    />
  );
}

// ---------- Press feedback ----------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressScale(to = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { scale.value = withTiming(to, { duration: 90 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 14, stiffness: 260 }); },
  };
}

// ---------- Buttons ----------
type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "soft" | "quiet" | "outline" | "danger";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Primary buttons are a green gradient with a soft glow; others are tinted or outlined. */
export function Button({ title, onPress, variant = "primary", icon, disabled, loading, style }: ButtonProps) {
  const { colors, isDark } = useTheme();
  const press = usePressScale();
  const inactive = disabled || loading;
  const primary = variant === "primary";
  // Primary keeps a solid green under its gradient so Android draws the glow.
  const bg = primary ? colors.green : variant === "soft" ? colors.greenSoft : variant === "quiet" ? colors.mist : variant === "danger" ? colors.dangerSoft : "transparent";
  const fg = primary ? "#FFFFFF" : variant === "soft" ? colors.greenText : variant === "danger" ? colors.danger : colors.ink;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => { tap(); onPress?.(); }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        { height: 58, borderRadius: radius.control, backgroundColor: bg, opacity: disabled ? 0.45 : 1 },
        primary && !disabled && glow(isDark),
        (variant === "outline" || variant === "quiet") && { borderWidth: 1, borderColor: colors.line },
        press.style,
        style,
      ]}
    >
      {primary ? (
        <LinearGradient colors={[colors.heroA, colors.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.control }]} />
      ) : null}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20 }}>
        {loading ? <ActivityIndicator color={fg} /> : (
          <>
            {icon && <Icon name={icon} size={20} color={fg} />}
            <Txt variant="button" style={{ color: fg }} numberOfLines={1}>{title}</Txt>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

export function IconButton({ name, onPress, label, size = 48, color, filled = true, style, tone }: {
  name: IconName; onPress?: () => void; label: string; size?: number; color?: string; filled?: boolean; style?: StyleProp<ViewStyle>; tone?: TintName | "danger";
}) {
  const { colors, isDark } = useTheme();
  const press = usePressScale(0.92);
  const t = tone === "danger" ? { bg: colors.dangerSoft, fg: colors.danger } : tone ? tint(tone, isDark) : null;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => { tap(); onPress?.(); }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{
        width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
        backgroundColor: t ? t.bg : filled ? colors.mist : "transparent",
        borderWidth: !t && filled ? 1 : 0, borderColor: colors.line,
      }, press.style, style]}
    >
      <Icon name={name} size={size * 0.44} color={color ?? t?.fg ?? colors.ink} />
    </AnimatedPressable>
  );
}

/** Round frosted button floating over the map. */
export function MapButton({ name, onPress, label, style }: { name: IconName; onPress: () => void; label: string; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const press = usePressScale(0.92);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { tap(); onPress(); }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ position: "absolute", width: 48, height: 48, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center",
        backgroundColor: Platform.OS === "ios" ? "transparent" : colors.glass, borderWidth: 1, borderColor: colors.glassLine, ...shadow(1, isDark) }, press.style, style]}
    >
      {Platform.OS === "ios" ? <BlurView intensity={50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
      <Icon name={name} size={22} />
    </AnimatedPressable>
  );
}

// ---------- Small pieces ----------
export function Chip({ label, onPress, icon, active }: { label: string; onPress: () => void; icon?: IconName; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: active ? colors.greenSoft : colors.mist, borderRadius: radius.chip, paddingHorizontal: 13, paddingVertical: 9,
        borderWidth: 1, borderColor: active ? "transparent" : colors.line, opacity: pressed ? 0.75 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={16} color={active ? colors.greenText : colors.ink} /> : null}
      <Txt variant="label" color={active ? "greenText" : "ink"}>{label}</Txt>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", backgroundColor: colors.mist, borderRadius: 14, padding: 4, gap: 4, borderWidth: 1, borderColor: colors.line }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => { tap(); onChange(o.value); }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: on ? colors.green : "transparent" }}
          >
            <Txt variant="label" style={{ color: on ? colors.greenInk : colors.muted }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Initials on a green gradient with a soft ring. */
export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const ring = Math.max(2, size * 0.05);
  return (
    <View style={{ width: size + ring * 4, height: size + ring * 4, borderRadius: size, borderWidth: ring, borderColor: colors.greenSoft, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        <LinearGradient colors={[colors.heroA, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.34, color: "#FFFFFF" }}>{initials}</Text>
      </View>
    </View>
  );
}

/** Number plate, styled like a Nigerian plate so riders can match it at a glance. */
export function Plate({ text }: { text: string }) {
  return (
    <View style={{ borderWidth: 2, borderColor: "#0C1D15", borderRadius: 10, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, backgroundColor: "#FFFFFF", alignItems: "center" }}>
      <Text style={{ position: "absolute", top: -7, fontFamily: fonts.bodyBold, fontSize: 7, letterSpacing: 1.2, color: "#00874F", backgroundColor: "#FFFFFF", paddingHorizontal: 4 }}>SOKOTO</Text>
      <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 14, letterSpacing: 1.1, color: "#0C1D15" }}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const p = useSharedValue(0);
  React.useEffect(() => { p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 600 }); }, [value, p]);
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: 3, backgroundColor: colors.green }, style]} />
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

/** A settings row with a coloured icon badge. Put rows inside <Group> (components/visual). */
export function SettingRow({ icon, title, detail, onPress, danger, right, tone = "green" }: {
  icon: IconName; title: string; detail?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode; tone?: TintName;
}) {
  const { colors, isDark } = useTheme();
  const t = danger ? { bg: colors.dangerSoft, fg: colors.danger } : tint(tone, isDark);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress && (() => { tap(); onPress(); })}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: pressed ? colors.mist : "transparent" })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={20} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="bodyStrong" style={danger ? { color: colors.danger } : undefined}>{title}</Txt>
        {detail ? <Txt variant="caption" color="muted" numberOfLines={1}>{detail}</Txt> : null}
      </View>
      {right ?? (onPress && !danger ? <Icon name="forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function Pressy(props: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const { style, ...rest } = props;
  return <Pressable {...rest} style={({ pressed }) => [style, { opacity: pressed ? 0.75 : 1 }]} />;
}
