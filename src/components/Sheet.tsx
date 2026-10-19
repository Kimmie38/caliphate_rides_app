import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { radius } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  /** Reports the sheet's visible height so the map can keep the route visible above it. */
  onHeight?: (h: number) => void;
  /** Extra space at the bottom, e.g. for the floating tab bar. */
  bottomOffset?: number;
  /** Kept for older call sites: the sheet always scrolls when its content is taller than it can grow. */
  scroll?: boolean;
  /** Tallest the sheet may grow, as a share of the screen height. */
  maxHeightRatio?: number;
  /**
   * A lower height (in px) the rider can pull the sheet down to, to see more of the map.
   * The sheet opens fully and can be pulled back up from here.
   */
  peek?: number;
  style?: StyleProp<ViewStyle>;
};

const HANDLE_H = 24; // the grab handle area the sheet library draws above the content

/**
 * Bottom sheet over the map. Drag the handle (or the content) up and down; content scrolls once
 * the sheet is at its tallest. Sizes itself to its content, up to `maxHeightRatio` of the screen.
 */
export function Sheet({ children, onHeight, bottomOffset = 0, maxHeightRatio = 0.82, peek, style }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const maxH = Math.min(Math.round(screenH * maxHeightRatio), screenH - insets.top - 60);
  const padBottom = (bottomOffset || insets.bottom) + 20;

  const [contentH, setContentH] = useState(0);
  const [index, setIndex] = useState(peek ? 1 : 0); // open fully at first
  const snapPoints = useMemo(() => (peek ? [peek] : []), [peek]);

  // Visible height, for framing the map above the sheet.
  const fullH = Math.min(contentH + HANDLE_H, maxH);
  useEffect(() => {
    if (!onHeight || !contentH) return;
    onHeight(peek && index === 0 ? Math.min(peek, fullH) : fullH);
  }, [index, fullH, peek, contentH]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BottomSheet
      index={peek ? 1 : 0}
      snapPoints={snapPoints}
      enableDynamicSizing
      maxDynamicContentSize={maxH}
      enablePanDownToClose={false}
      onChange={(i) => { if (i >= 0) setIndex(i); }}
      backgroundStyle={{
        backgroundColor: colors.paper, borderRadius: radius.sheet,
        borderWidth: isDark ? 1 : 0, borderColor: colors.line,
      }}
      handleIndicatorStyle={{ backgroundColor: isDark ? colors.muted : colors.line, width: 44, height: 5 }}
      style={{
        borderRadius: radius.sheet,
        shadowColor: "#0C1D15", shadowOpacity: isDark ? 0.5 : 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 18,
      }}
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View
          onLayout={(e) => setContentH(Math.round(e.nativeEvent.layout.height))}
          style={[{ gap: 16, paddingHorizontal: 20, paddingTop: 4, paddingBottom: padBottom }, style]}
        >
          {children}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
