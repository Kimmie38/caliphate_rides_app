import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import type { PlaceCategory } from "../types";

type IonName = keyof typeof Ionicons.glyphMap;

const ION = {
  search: "search-outline",
  home: "home-outline",
  work: "briefcase-outline",
  clock: "time-outline",
  wallet: "wallet-outline",
  user: "person-outline",
  phone: "call-outline",
  chat: "chatbubble-outline",
  share: "share-outline",
  shield: "shield-checkmark-outline",
  close: "close",
  back: "chevron-back",
  forward: "chevron-forward",
  locate: "locate-outline",
  cash: "cash-outline",
  moon: "moon-outline",
  globe: "globe-outline",
  people: "people-outline",
  pin: "location-outline",
  help: "help-circle-outline",
  logout: "log-out-outline",
  add: "add",
  star: "star",
  map: "map-outline",
  swap: "swap-vertical",
  alert: "alert-circle-outline",
  check: "checkmark-circle",
  card: "card-outline",
  transfer: "swap-horizontal-outline",
  copy: "copy-outline",
  camera: "camera-outline",
  arrow: "arrow-forward",
  checkmark: "checkmark",
  idcard: "card-outline",
  phoneapp: "phone-portrait-outline",
  bell: "notifications-outline",
  document: "document-text-outline",
  power: "power",
  navigate: "navigate-outline",
  cash2: "cash",
  time: "time-outline",
  person: "person-circle-outline",
  ribbon: "ribbon-outline",
  refresh: "refresh",
} satisfies Record<string, IonName>;

export type IconName = keyof typeof ION | "keke" | "car";

export const CATEGORY_ICON: Record<PlaceCategory, IonName> = {
  market: "basket-outline",
  mosque: "moon-outline",
  school: "school-outline",
  health: "medkit-outline",
  gov: "business-outline",
  landmark: "flag-outline",
  transport: "bus-outline",
  shopping: "bag-handle-outline",
  hotel: "bed-outline",
  airport: "airplane-outline",
  saved: "bookmark-outline",
  pin: "location-outline",
  search: "location-outline",
};

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  const c = color ?? colors.ink;
  if (name === "keke") return <KekeIcon size={size} color={c} />;
  if (name === "car") return <CarIcon size={size} color={c} />;
  return <Ionicons name={ION[name]} size={size} color={c} />;
}

export function CategoryIcon({ category, size = 20, color }: { category: PlaceCategory; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Ionicons name={CATEGORY_ICON[category]} size={size} color={color ?? colors.greenText} />;
}

const stroke = (color: string) => ({ stroke: color, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" });

/** Keke (tricycle), side view. Drawn for this app; no icon set has one. */
export function KekeIcon({ size = 24, color = "#000" }: { size?: number; color?: string }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 5h9.5c1.6 0 2.9 1.1 3.3 2.6L18 12.5" {...s} />
      <Path d="M5.5 5v8M3 13h17.5v2.5H19M3 13v2.5h1.5M8.5 15.5h8M5.5 9h8" {...s} />
      <Circle cx={6.5} cy={17} r={2} {...s} />
      <Circle cx={17.5} cy={17} r={2} {...s} />
    </Svg>
  );
}

export function CarIcon({ size = 24, color = "#000" }: { size?: number; color?: string }) {
  const s = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2.5 15v-2.6a1.4 1.4 0 0 1 .9-1.3l2.4-.9 2.1-3.1A2 2 0 0 1 9.6 6.2h5a2 2 0 0 1 1.5.7l2.7 3.2 2.3.6a1.4 1.4 0 0 1 1 1.4V15" {...s} />
      <Path d="M2.5 15h2M8.5 15.5h7M19.5 15h2M6 10.2h13" {...s} />
      <Circle cx={6.5} cy={16} r={2} {...s} />
      <Circle cx={17.5} cy={16} r={2} {...s} />
    </Svg>
  );
}
