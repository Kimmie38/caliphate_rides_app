import type { CameraRef, LngLat } from "@maplibre/maplibre-react-native";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ENV } from "../../config/env";
import { serviceCenter } from "../../lib/area";
import type { LatLng } from "../../lib/geo";
import { buildMapStyle } from "../../map/style";
import { tint, type TintName } from "../../theme/tints";
import { useTheme } from "../../theme/ThemeProvider";
import { MAP_ENGINE, MLRN } from "./engine";
import { placesGeoJSON } from "./mapPlaces";
import type { Insets, RideMapHandle, RideMapProps } from "./types";
import { WebRideMap } from "./WebRideMap";

export type { Insets, RideMapHandle, RideMapProps } from "./types";

const TINTS: TintName[] = ["market", "health", "school", "mosque", "transport", "shopping", "airport", "gov", "hotel", "green"];
const toLngLat = (p: LatLng): LngLat => [p.longitude, p.latitude];

/**
 * The Caliphate Rides map: OpenStreetMap data in our own white-and-green style (src/map/style.ts).
 * In your own build it uses MapLibre's native engine; in Expo Go it draws the same map in a web view.
 */
export const RideMap = forwardRef<RideMapHandle, RideMapProps>(function RideMap(props, ref) {
  return MAP_ENGINE === "native" ? <NativeRideMap {...props} ref={ref} /> : <WebRideMap {...props} ref={ref} />;
});

const NativeRideMap = forwardRef<RideMapHandle, RideMapProps>(function NativeRideMap(
  { center, zoom = 15, onCenterChange, showPlaces = true, children },
  ref,
) {
  const { Map, Camera } = MLRN!;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraRef>(null);

  const mapStyle = useMemo(() => {
    const tints = Object.fromEntries(TINTS.map((t) => [t, tint(t, isDark)]));
    return buildMapStyle(colors, tints, isDark, { tilesUrl: ENV.mapTilesUrl, glyphsUrl: ENV.mapGlyphsUrl });
  }, [colors, isDark]);

  // The camera only takes the starting view once; after that screens move it with frame().
  const initial = useRef(center ?? serviceCenter());

  useImperativeHandle(ref, () => ({
    frame: (points, inset, animated = true) => {
      const cam = camera.current;
      if (!cam || points.length === 0) return;
      const padding = { top: inset.top, bottom: inset.bottom, left: inset.left ?? 48, right: inset.right ?? 48 };
      const duration = animated ? 650 : 0;
      const lngs = points.map((p) => p.longitude);
      const lats = points.map((p) => p.latitude);
      const [w, e, s, n] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
      // One point (or points on top of each other): centre on it at street level.
      if (e - w < 0.0005 && n - s < 0.0005) {
        cam.easeTo({ center: [(w + e) / 2, (s + n) / 2], zoom: 15.5, padding, duration });
      } else {
        cam.fitBounds([w, s, e, n], { padding, duration });
      }
    },
  }), []);

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      attribution
      attributionPosition={{ top: insets.top + 68, right: 18 }}
      tintColor={colors.green}
      onRegionDidChange={onCenterChange ? (e) => {
        const [lng, lat] = e.nativeEvent.center;
        onCenterChange({ latitude: lat, longitude: lng });
      } : undefined}
    >
      <Camera ref={camera} initialViewState={{ center: toLngLat(initial.current), zoom }} minZoom={8} maxZoom={19} />
      {showPlaces ? <SokotoPlaces /> : null}
      {children}
    </Map>
  );
});

/** Our own list of Sokoto places (markets, mosques, hospitals…), drawn in their category colours. */
function SokotoPlaces() {
  const { GeoJSONSource, Layer } = MLRN!;
  const { isDark, colors } = useTheme();
  const data = useMemo(() => placesGeoJSON(isDark), [isDark]);
  return (
    <GeoJSONSource id="sokoto-places" data={data}>
      <Layer id="sokoto-places-dot" type="circle" minzoom={11}
        paint={{
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 15, 6, 18, 8],
          "circle-stroke-color": colors.paper,
          "circle-stroke-width": 2,
        }} />
      <Layer id="sokoto-places-label" type="symbol" minzoom={13}
        layout={{
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 11, 17, 13],
          "text-max-width": 9,
          "text-variable-anchor": ["left", "right", "top", "bottom"],
          "text-radial-offset": 0.9,
          "text-justify": "auto",
          "text-optional": true,
          "symbol-sort-key": ["-", 1, ["get", "popular"]],
        }}
        paint={{ "text-color": ["get", "color"], "text-halo-color": colors.paper, "text-halo-width": 1.6 }} />
    </GeoJSONSource>
  );
}

/** Fits points into the visible part of the map (above the sheet). Safe to call before the map is ready. */
export function frame(map: RideMapHandle | null, points: LatLng[], inset: Insets, animated = true) {
  map?.frame(points, inset, animated);
}
