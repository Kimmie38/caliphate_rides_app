import React, { useMemo } from "react";
import { View } from "react-native";
import type { LatLng } from "../../lib/geo";
import type { RideTypeId } from "../../lib/pricing";
import { useTheme } from "../../theme/ThemeProvider";
import { CarIcon, KekeIcon } from "../Icon";
import { KnotMark } from "../Knot";
import { MLRN } from "./engine";
import { useWebOverlay } from "./overlays";

// Each marker works with both map engines: in the web engine (Expo Go) it registers itself with
// the web map, which draws the same design; in the native engine it renders a MapLibre marker.

const at = (p: LatLng): [number, number] => [p.longitude, p.latitude];

export function UserDot({ coordinate }: { coordinate: LatLng }) {
  const { colors } = useTheme();
  if (useWebOverlay("you", { kind: "user", at: coordinate })) return null;
  const { Marker } = MLRN!;
  return (
    <Marker id="you" lngLat={at(coordinate)} anchor="center">
      <View accessibilityLabel="Your location" style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 54, height: 54, borderRadius: 27, backgroundColor: colors.green, opacity: 0.16 }} />
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, borderWidth: 4, borderColor: colors.paper }} />
      </View>
    </Marker>
  );
}

export function PickupPin({ coordinate }: { coordinate: LatLng }) {
  const { colors } = useTheme();
  if (useWebOverlay("pickup", { kind: "pickup", at: coordinate })) return null;
  const { Marker } = MLRN!;
  return (
    <Marker id="pickup" lngLat={at(coordinate)} anchor="bottom">
      <View accessibilityLabel="Pickup" style={{ alignItems: "center" }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.paper }}>
          <KnotMark size={24} color={colors.greenInk} strokeWidth={10} />
        </View>
        <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: colors.green }} />
      </View>
    </Marker>
  );
}

export function DropPin({ coordinate }: { coordinate: LatLng }) {
  const { colors } = useTheme();
  if (useWebOverlay("destination", { kind: "drop", at: coordinate })) return null;
  const { Marker } = MLRN!;
  return (
    <Marker id="destination" lngLat={at(coordinate)} anchor="bottom">
      <View accessibilityLabel="Destination" style={{ alignItems: "center" }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.paper }} />
        </View>
        <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: colors.ink }} />
      </View>
    </Marker>
  );
}

/** The driver's vehicle. The green notch points the way they're heading. */
export function DriverMarker({ coordinate, heading, rideType }: { coordinate: LatLng; heading: number; rideType: RideTypeId }) {
  const { colors } = useTheme();
  if (useWebOverlay("driver", { kind: "driver", at: coordinate, heading, rideType })) return null;
  const { Marker } = MLRN!;
  const Glyph = rideType === "keke" ? KekeIcon : CarIcon;
  return (
    <Marker id="driver" lngLat={at(coordinate)} anchor="center">
      <View accessibilityLabel="Your driver" style={{ width: 58, height: 58, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 58, height: 58, alignItems: "center", transform: [{ rotate: `${heading}deg` }] }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: colors.green }} />
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.green, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
          <Glyph size={24} color={colors.greenText} />
        </View>
      </View>
    </Marker>
  );
}

/** The trip's road route: a green line with a white edge, drawn on the map itself. */
export function RouteLine({ path }: { path: LatLng[] }) {
  const { colors } = useTheme();
  const isWeb = useWebOverlay("route", path.length >= 2 ? { kind: "route", path } : null);
  const data = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(() => ({
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: path.map(at) },
  }), [path]);
  if (isWeb || path.length < 2) return null;
  const { GeoJSONSource, Layer } = MLRN!;
  return (
    <GeoJSONSource id="route" data={data}>
      <Layer id="route-edge" type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": colors.paper, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 11] }} />
      <Layer id="route-line" type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": colors.green, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3.5, 16, 6.5] }} />
    </GeoJSONSource>
  );
}
