import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { serviceCenter } from "../../lib/area";
import { mapSourcesFor } from "../../map/sources";
import { buildMapStyle, mapGroundColor } from "../../map/style";
import { tint, type TintName } from "../../theme/tints";
import { useTheme } from "../../theme/ThemeProvider";
import { placesGeoJSON } from "./mapPlaces";
import { usePlacesVersion } from "../../data/landmarks";
import { OverlayContext, type Overlay } from "./overlays";
import type { RideMapHandle, RideMapProps } from "./types";
import { webMapPage, type MarkerColors } from "./webMapPage";

const TINTS: TintName[] = ["market", "health", "school", "mosque", "transport", "shopping", "airport", "gov", "hotel", "green"];

/**
 * Our map drawn in a web view (MapLibre GL). Used in Expo Go, where the native map engine isn't available.
 * Same style, places, pins and route as the native map.
 */
export const WebRideMap = forwardRef<RideMapHandle, RideMapProps>(function WebRideMap(
  { center, zoom = 15, onCenterChange, showPlaces = true, children },
  ref,
) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const view = useRef<WebView>(null);
  const ready = useRef(false);
  const queue = useRef<string[]>([]);
  const overlays = useRef<Record<string, Overlay>>({});
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerCb = useRef(onCenterChange);
  centerCb.current = onCenterChange;

  // Our Sokoto map in and around Sokoto; the public map elsewhere (testing in another city).
  const sources = mapSourcesFor(center ?? serviceCenter());
  const style = useMemo(() => {
    const tints = Object.fromEntries(TINTS.map((t) => [t, tint(t, isDark)]));
    return buildMapStyle(colors, tints, isDark, sources);
  }, [colors, isDark, sources]);
  const markerColors: MarkerColors = useMemo(() => ({
    green: colors.green, greenInk: colors.greenInk, greenText: colors.greenText, paper: colors.paper, ink: colors.ink,
    ground: mapGroundColor(colors, isDark),
  }), [colors, isDark]);
  const placesVersion = usePlacesVersion();
  const places = useMemo(() => (showPlaces ? placesGeoJSON(isDark) : null), [showPlaces, isDark, placesVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // The page is built once; later theme changes are sent to it.
  const start = useRef(center ?? serviceCenter());
  const html = useMemo(() => webMapPage({
    style, zoom, colors: markerColors, places, creditTop: insets.top + 68,
    center: [start.current.longitude, start.current.latitude],
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback((js: string) => {
    if (ready.current) view.current?.injectJavaScript(`${js};true;`);
    else queue.current.push(js);
  }, []);

  const flush = useCallback(() => {
    flushTimer.current = null;
    const list = Object.entries(overlays.current).map(([id, o]) => ({ id, ...o }));
    run(`cr.overlays(${JSON.stringify(list)})`);
  }, [run]);

  // Markers register here. Updates are batched (at most ~10 a second) so a moving driver stays smooth.
  const ctx = useMemo(() => ({
    set: (id: string, overlay: Overlay | null) => {
      if (overlay) overlays.current[id] = overlay;
      else delete overlays.current[id];
      if (!flushTimer.current) flushTimer.current = setTimeout(flush, 100);
    },
  }), [flush]);
  useEffect(() => () => { if (flushTimer.current) clearTimeout(flushTimer.current); }, []);

  const firstTheme = useRef(true);
  useEffect(() => {
    if (firstTheme.current) { firstTheme.current = false; return; }
    run(`cr.setTheme(${JSON.stringify(style)}, ${JSON.stringify(markerColors)}, ${JSON.stringify(places)})`);
  }, [style]); // eslint-disable-line react-hooks/exhaustive-deps

  // Places loaded from the server after the map opened.
  const firstPlaces = useRef(true);
  useEffect(() => {
    if (firstPlaces.current) { firstPlaces.current = false; return; }
    if (places) run(`cr.setPlaces(${JSON.stringify(places)})`);
  }, [placesVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    frame: (points, inset, animated = true) => {
      if (!points.length) return;
      const padding = { top: inset.top, bottom: inset.bottom, left: inset.left ?? 48, right: inset.right ?? 48 };
      run(`cr.frame(${JSON.stringify(points.map((p) => [p.longitude, p.latitude]))}, ${JSON.stringify(padding)}, ${animated ? 650 : 0})`);
    },
  }), [run]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: any;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === "ready") {
      ready.current = true;
      const pending = queue.current;
      queue.current = [];
      for (const js of pending) view.current?.injectJavaScript(`${js};true;`);
      flush();
    } else if (m.type === "center") {
      centerCb.current?.({ latitude: m.lat, longitude: m.lng });
    } else if (m.type === "error") {
      console.warn("[map]", m.message);
    }
  };

  return (
    <OverlayContext.Provider value={ctx}>
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={view}
          source={{ html, baseUrl: "https://localhost/" }}
          originWhitelist={["*"]}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          androidLayerType="hardware"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onContentProcessDidTerminate={() => { ready.current = false; view.current?.reload(); }}
          onRenderProcessGone={() => { ready.current = false; view.current?.reload(); }}
          style={{ flex: 1, backgroundColor: markerColors.ground }}
        />
        {children}
      </View>
    </OverlayContext.Provider>
  );
});
