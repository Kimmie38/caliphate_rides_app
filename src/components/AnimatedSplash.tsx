import React, { useEffect } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { BRAND } from "../config/brand";
import { useTheme } from "../theme/ThemeProvider";

const LOGO_CORE = require("../../assets/logo-core.png");
const LOGO_RING = require("../../assets/logo-ring.png");

const HOLD_UNTIL_MS = 2400; // when the reveal starts
const REVEAL_MS = 650;

/**
 * The opening moment, built from the official badge:
 *   1. the castle emblem grows in,
 *   2. the "Caliphate • Ride" text ring spins into place around it,
 *   3. a soft ring pulses out once,
 *   4. the green field closes into a circle to reveal the app underneath.
 * The native splash (same green, no image) shows while fonts load, so the hand-off is seamless.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const size = Math.min(W * 0.66, 280);

  const core = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(0);
  const breathe = useSharedValue(1);
  const reveal = useSharedValue(1); // 1 = full screen, 0 = closed

  useEffect(() => {
    if (reduced) {
      reveal.value = withDelay(800, withTiming(0, { duration: 250 }));
      const t = setTimeout(onFinish, 1100);
      return () => clearTimeout(t);
    }
    core.value = withDelay(120, withSpring(1, { damping: 13, stiffness: 120, mass: 0.9 }));
    ring.value = withDelay(380, withTiming(1, { duration: 950, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    pulse.value = withDelay(1250, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    breathe.value = withDelay(1250, withSequence(
      withTiming(1.04, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
    ));
    reveal.value = withDelay(HOLD_UNTIL_MS, withTiming(0, { duration: REVEAL_MS, easing: Easing.bezier(0.7, 0, 0.3, 1) }));
    const t = setTimeout(onFinish, HOLD_UNTIL_MS + REVEAL_MS + 30);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const coreStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, core.value * 1.6),
    transform: [{ scale: 0.35 + 0.65 * core.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, ring.value * 2),
    transform: [{ rotate: `${-200 * (1 - ring.value)}deg` }, { scale: 1.3 - 0.3 * ring.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.55 * pulse.value }],
  }));

  // Circle reveal: a circular window that shrinks to nothing; content inside stays fixed on screen.
  const cx = W / 2, cy = H * 0.46;
  const D = 2 * Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const circleStyle = useAnimatedStyle(() => {
    const s = Math.max(0.0001, D * reveal.value);
    return { width: s, height: s, borderRadius: s / 2, left: cx - s / 2, top: cy - s / 2 };
  });
  const innerStyle = useAnimatedStyle(() => {
    const s = D * reveal.value;
    return { left: -(cx - s / 2), top: -(cy - s / 2) };
  });

  const layer = { position: "absolute" as const, width: size, height: size };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityLabel={`${BRAND.name}. ${BRAND.tagline}.`}>
      <Animated.View style={[{ position: "absolute", overflow: "hidden" }, circleStyle]}>
        <Animated.View style={[{ position: "absolute", width: W, height: H, backgroundColor: colors.splashBg }, innerStyle]}>
          <Animated.View style={[{ position: "absolute", left: cx - size / 2, top: cy - size / 2, width: size, height: size }, badgeStyle]}>
            {/* One white ring that pulses out from the badge edge */}
            <Animated.View style={[layer, { borderRadius: size / 2, borderWidth: 3, borderColor: colors.splashFg }, pulseStyle]} />
            <Animated.View style={[layer, coreStyle]}>
              <Image source={LOGO_CORE} style={{ width: size, height: size }} resizeMode="contain" />
            </Animated.View>
            <Animated.View style={[layer, ringStyle]}>
              <Image source={LOGO_RING} style={{ width: size, height: size }} resizeMode="contain" />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
