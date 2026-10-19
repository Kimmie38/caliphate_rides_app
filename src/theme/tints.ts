import type { PlaceCategory } from "../types";

// Colour-coded place categories: markets amber, schools blue, hospitals red, and so on.
// Each is a soft background with a deeper foreground for the icon.
type Tint = { bg: string; fg: string };

const LIGHT: Record<string, Tint> = {
  market: { bg: "#FFF0D6", fg: "#A35F00" },
  health: { bg: "#FFE5E3", fg: "#BF352B" },
  school: { bg: "#E3EEFF", fg: "#2354AD" },
  mosque: { bg: "#DCF4F0", fg: "#0D7468" },
  transport: { bg: "#E8EDF4", fg: "#3B4E65" },
  shopping: { bg: "#FFE6F1", fg: "#AD2869" },
  airport: { bg: "#E1F0FF", fg: "#1D63B0" },
  gov: { bg: "#EEE8FF", fg: "#5A3EBF" },
  hotel: { bg: "#EFE9FF", fg: "#6A45C7" },
  green: { bg: "#E2F4EA", fg: "#006B3F" },
};

const DARK: Record<string, Tint> = {
  market: { bg: "#3A2A0D", fg: "#F6C46A" },
  health: { bg: "#3A1714", fg: "#FF8A80" },
  school: { bg: "#142540", fg: "#8DB8FF" },
  mosque: { bg: "#0F2E2A", fg: "#6FE0D0" },
  transport: { bg: "#1A222D", fg: "#A9BBD1" },
  shopping: { bg: "#3A1328", fg: "#FF8DC6" },
  airport: { bg: "#10263C", fg: "#86C3FF" },
  gov: { bg: "#231B40", fg: "#B9A6FF" },
  hotel: { bg: "#241B3D", fg: "#C4B0FF" },
  green: { bg: "#12301F", fg: "#63DCA3" },
};

export type TintName = keyof typeof LIGHT;

const CATEGORY_TINT: Record<PlaceCategory, TintName> = {
  market: "market", health: "health", school: "school", mosque: "mosque", transport: "transport",
  shopping: "shopping", airport: "airport", gov: "gov", hotel: "hotel",
  landmark: "green", saved: "green", pin: "green", search: "green",
};

export function tint(name: TintName, isDark: boolean): Tint {
  return (isDark ? DARK : LIGHT)[name] ?? (isDark ? DARK : LIGHT).green;
}

export function categoryTint(category: PlaceCategory, isDark: boolean): Tint {
  return tint(CATEGORY_TINT[category] ?? "green", isDark);
}
