// Design tokens: white + green, light and dark.
// Green is anchored on Nigeria's flag green (#008751), deepened slightly for contrast with white text.

export type Palette = {
  canvas: string; // background behind cards and lists
  paper: string; // surfaces: sheets, cards, inputs
  mist: string; // raised quiet fills (fields, chips, secondary buttons)
  line: string; // dividers and outlines
  ink: string; // primary text
  muted: string; // secondary text
  green: string; // brand and primary actions
  greenDeep: string;
  mint: string; // bright highlight (chart bars, glows)
  greenInk: string; // text and icons on green
  greenSoft: string; // selected backgrounds
  greenText: string; // green used as text on paper
  heroA: string; // hero gradient: light corner
  heroB: string; // hero gradient: body
  heroC: string; // hero gradient: deep corner
  glass: string; // frosted controls over the map
  glassLine: string;
  sun: string; // rating stars
  danger: string;
  dangerSoft: string;
  amberSoft: string;
  amberText: string;
  scrim: string;
  splashBg: string;
  splashFg: string;
};

export const light: Palette = {
  canvas: "#F3F6F4",
  paper: "#FFFFFF",
  mist: "#F1F5F2",
  line: "#E2EAE5",
  ink: "#0C1D15",
  muted: "#5E7167",
  green: "#00874F",
  greenDeep: "#005C37",
  mint: "#2FD08A",
  greenInk: "#FFFFFF",
  greenSoft: "#E2F4EA",
  greenText: "#006B3F",
  heroA: "#00A062",
  heroB: "#00753F",
  heroC: "#00482A",
  glass: "rgba(255,255,255,0.80)",
  glassLine: "rgba(255,255,255,0.75)",
  sun: "#F5A623",
  danger: "#D23F34",
  dangerSoft: "#FDE7E5",
  amberSoft: "#FFF2D9",
  amberText: "#8A5600",
  scrim: "rgba(12,29,21,0.35)",
  splashBg: "#00874F",
  splashFg: "#FFFFFF",
};

export const dark: Palette = {
  canvas: "#070F0B",
  paper: "#101C16",
  mist: "#15241C",
  line: "rgba(255,255,255,0.08)",
  ink: "#E8F2EC",
  muted: "#8DA396",
  green: "#2FC47F",
  greenDeep: "#0F5A37",
  mint: "#4BE3A2",
  greenInk: "#04140B",
  greenSoft: "#12301F",
  greenText: "#63DCA3",
  heroA: "#13804F",
  heroB: "#0A5434",
  heroC: "#05301D",
  glass: "rgba(16,28,22,0.82)",
  glassLine: "rgba(255,255,255,0.08)",
  sun: "#FFBE45",
  danger: "#FF7A70",
  dangerSoft: "#3A1714",
  amberSoft: "#3A2A0D",
  amberText: "#F6C46A",
  scrim: "rgba(0,0,0,0.55)",
  splashBg: "#0D1813",
  splashFg: "#2FC47F",
};

/** Soft layered shadows. Dark mode leans on borders and deeper shadows instead. */
export function shadow(level: 1 | 2 | 3, isDark: boolean) {
  const d = { 1: [2, 10, 0.07, 2], 2: [6, 20, 0.12, 6], 3: [14, 36, 0.18, 14] }[level];
  return {
    shadowColor: isDark ? "#000000" : "#0C1D15",
    shadowOffset: { width: 0, height: d[0] },
    shadowRadius: d[1],
    shadowOpacity: isDark ? Math.min(0.6, d[2] * 3) : d[2],
    elevation: d[3],
  };
}

/** Green glow under primary buttons and active tabs. */
export function glow(isDark: boolean) {
  return { shadowColor: isDark ? "#2FC47F" : "#00874F", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: isDark ? 0.25 : 0.32, elevation: 8 };
}

// Sora for display and numbers (fares, ETAs), Manrope for reading text.
export const fonts = {
  displaySemi: "Sora_600SemiBold",
  display: "Sora_700Bold",
  displayHeavy: "Sora_800ExtraBold",
  body: "Manrope_500Medium",
  bodyRegular: "Manrope_400Regular",
  bodySemi: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

// Radii by role, not one size for everything.
export const radius = { sheet: 32, hero: 28, card: 22, control: 18, field: 16, badge: 15, chip: 999, small: 10 } as const;

export const type = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 37, letterSpacing: -0.8 },
  page: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.75 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.35 },
  heading: { fontFamily: fonts.display, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17 },
  button: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 20 },
  price: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  eta: { fontFamily: fonts.displayHeavy, fontSize: 50, lineHeight: 52, letterSpacing: -2 },
  total: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 52, letterSpacing: -1.4 },
} as const;

export type TypeVariant = keyof typeof type;
