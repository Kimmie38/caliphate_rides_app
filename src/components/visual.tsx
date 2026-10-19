import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, Rect } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { tint, categoryTint, type TintName } from "../theme/tints";
import { fonts, radius, shadow } from "../theme/tokens";
import type { PlaceCategory } from "../types";
import { CategoryIcon, Icon, type IconName } from "./Icon";
import { KNOT_PATH } from "./Knot";
import { Txt } from "./ui";

let patternSeq = 0;

/** The Arewa knot repeated as a faint pattern, for hero surfaces. */
export function KnotPattern({ opacity = 0.1, size = 64, color = "#FFFFFF" }: { opacity?: number; size?: number; color?: string }) {
  const id = useMemo(() => `knot${++patternSeq}`, []);
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size}>
          <G scale={size / 100}>
            <Path d={KNOT_PATH} fill="none" stroke={color} strokeWidth={5} />
          </G>
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </Svg>
  );
}

/** Deep green gradient card with the knot pattern. Text on it is white. */
export function Hero({ children, style, glowing = false }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; glowing?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[{ borderRadius: radius.hero, overflow: "hidden" }, glowing && shadow(2, isDark), style]}>
      <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} locations={[0, 0.55, 1]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <KnotPattern />
      {children}
    </View>
  );
}

/** Frosted glass for controls floating over the map. Real blur on iPhone; a solid tint on Android. */
export function Glass({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const base: ViewStyle = { overflow: "hidden", borderWidth: 1, borderColor: colors.glassLine, ...shadow(1, isDark) };
  if (Platform.OS === "ios") {
    return (
      <View style={[base, style]}>
        <BlurView intensity={50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass, opacity: 0.6 }]} />
        {children}
      </View>
    );
  }
  return <View style={[base, { backgroundColor: colors.glass }, style]}>{children}</View>;
}

// ---------- Illustrations ----------
export function KekeArt({ width = 104 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.6} viewBox="0 0 120 72">
      <Ellipse cx={62} cy={67} rx={50} ry={3.2} fill="rgba(12,29,21,0.14)" />
      <Path d="M12 19 Q13 6 30 6 L80 6 Q91 6 97 14 L99 19 Z" fill="#0C3A25" />
      <Path d="M15 18 L19 18 L21 40 L17 40 Z" fill="#0C3A25" />
      <Path d="M93 17 L98 17 L107 40 L100 40 Z" fill="#CFF3E2" stroke="#0C3A25" strokeWidth={2} strokeLinejoin="round" />
      <Rect x={23} y={23} width={21} height={13} rx={4} fill="#0C3A25" opacity={0.9} />
      <Rect x={25} y={34} width={22} height={4} rx={2} fill="#0C3A25" opacity={0.9} />
      <Rect x={66} y={27} width={11} height={9} rx={3} fill="#0C3A25" opacity={0.9} />
      <Path d="M60 18 L62 18 L64 38 L62 38 Z" fill="#0C3A25" />
      <Path d="M10 42 Q10 37 17 37 L72 37 Q92 38 104 43 Q111 46 110 50 Q109 53 104 53 L16 53 Q10 53 10 48 Z" fill="#00874F" />
      <Path d="M10 44 L72 44 Q92 45 109 48" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.4} fill="none" />
      <Path d="M89 53 Q90 47 98 47 Q106 47 107 53 Z" fill="#005C37" />
      <Circle cx={29} cy={56} r={9} fill="#0C1D15" /><Circle cx={29} cy={56} r={3.8} fill="#C9D3CE" />
      <Circle cx={98} cy={58} r={7} fill="#0C1D15" /><Circle cx={98} cy={58} r={3} fill="#C9D3CE" />
      <Circle cx={108.5} cy={44.5} r={2} fill="#FFD25A" />
    </Svg>
  );
}

export function CarArt({ width = 104 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.6} viewBox="0 0 120 72">
      <Ellipse cx={61} cy={67} rx={54} ry={3.2} fill="rgba(12,29,21,0.14)" />
      <Path d="M7 50 Q7 41 15 39 L33 36 L46 22 Q49 18.5 55 18.5 L80 18.5 Q86 18.5 89 22 L101 36 L109 38 Q115 40 115 48 L115 51 Q115 55 111 55 L11 55 Q7 55 7 51 Z" fill="#00874F" />
      <Path d="M50 24 Q52 22 55 22 L66 22 L66 35 L38 35 Z" fill="#E9FBF2" />
      <Path d="M70 22 L80 22 Q84 22 86 25 L95 35 L70 35 Z" fill="#E9FBF2" />
      <Rect x={7} y={41} width={108} height={2.6} fill="#FFFFFF" opacity={0.55} />
      <Circle cx={31} cy={55} r={9} fill="#0C1D15" /><Circle cx={31} cy={55} r={3.8} fill="#C9D3CE" />
      <Circle cx={92} cy={55} r={9} fill="#0C1D15" /><Circle cx={92} cy={55} r={3.8} fill="#C9D3CE" />
      <Rect x={110} y={42} width={5} height={3} rx={1.5} fill="#FFD25A" />
      <Rect x={7} y={42} width={4} height={3} rx={1.5} fill="#E2483D" />
    </Svg>
  );
}

export function VehicleArt({ type, width }: { type: "keke" | "car"; width?: number }) {
  return type === "keke" ? <KekeArt width={width} /> : <CarArt width={width} />;
}

// ---------- Badges, cards, chips ----------
/** Icon in a soft tinted squircle. */
export function Badge({ icon, tone = "green", size = 44 }: { icon: IconName; tone?: TintName; size?: number }) {
  const { isDark } = useTheme();
  const t = tint(tone, isDark);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={size * 0.5} color={t.fg} />
    </View>
  );
}

/** Badge coloured by place type (markets amber, schools blue…). */
export function PlaceBadge({ category, size = 44 }: { category: PlaceCategory; size?: number }) {
  const { isDark } = useTheme();
  const t = categoryTint(category, isDark);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <CategoryIcon category={category} size={size * 0.5} color={t.fg} />
    </View>
  );
}

/** White surface with a soft shadow (and a hairline in dark mode). */
export function Card({ children, style, padded = true }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.paper, borderRadius: radius.card, borderWidth: isDark ? 1 : 0, borderColor: colors.line, ...shadow(1, isDark) }, padded && { padding: 16 }, style]}>
      {children}
    </View>
  );
}

/** Rows grouped in one card, separated by hairlines. */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Card padded={false} style={[{ overflow: "hidden" }, style]}>
      {items.map((c, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>{c}</View>
      ))}
    </Card>
  );
}

export type ChipTone = "neutral" | "green" | "amber" | "red";
export function Tag({ text, tone = "neutral", icon }: { text: string; tone?: ChipTone; icon?: IconName }) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.mist, fg: colors.ink, border: colors.line },
    green: { bg: colors.greenSoft, fg: colors.greenText, border: "transparent" },
    amber: { bg: colors.amberSoft, fg: colors.amberText, border: "transparent" },
    red: { bg: colors.dangerSoft, fg: colors.danger, border: "transparent" },
  }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: map.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: map.border }}>
      {icon ? <Icon name={icon} size={14} color={map.fg} /> : null}
      <Txt variant="label" style={{ color: map.fg, fontSize: 12 }}>{text}</Txt>
    </View>
  );
}

/** Circular progress (countdowns, documents approved). */
export function Ring({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.line} strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.green} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={[c, c]} strokeDashoffset={c * (1 - v)} />
      </Svg>
      {label ? <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: size * 0.27 }} tabular>{label}</Txt> : null}
    </View>
  );
}

/** Small number tile (trips today, rating…). */
export function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.mist, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.line }}>
      <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 19 }} tabular>{value}</Txt>
      <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodyBold }}>{label}</Txt>
    </View>
  );
}
