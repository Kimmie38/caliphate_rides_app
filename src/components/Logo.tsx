import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { BRAND } from "../config/brand";

const LOGO = require("../../assets/logo.png");

/** The official Caliphate Ride badge (white disc, green artwork). */
export function Logo({ size = 120, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={LOGO} accessibilityLabel={`${BRAND.name} logo`} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}
