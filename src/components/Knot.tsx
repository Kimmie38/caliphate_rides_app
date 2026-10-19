import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

export { KNOT_LENGTH, KNOT_PATH } from "./knotPath";
import { KNOT_PATH } from "./knotPath";

export function KnotMark({ size = 40, color, strokeWidth = 8 }: { size?: number; color?: string; strokeWidth?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={KNOT_PATH} fill="none" stroke={color ?? colors.green} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

/** App mark: white knot on a green tile. */
export function KnotTile({ size = 64 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }}>
      <KnotMark size={size * 0.72} color={colors.greenInk} strokeWidth={9} />
    </View>
  );
}
