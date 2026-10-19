import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React, { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KnotMark } from "../../src/components/Knot";
import { RideMap } from "../../src/components/map/RideMap";
import { Sheet } from "../../src/components/Sheet";
import { Button, MapButton, Txt } from "../../src/components/ui";
import { inServiceArea, serviceCenter } from "../../src/lib/area";
import type { LatLng } from "../../src/lib/geo";
import { describePoint } from "../../src/services/places";
import { useRide } from "../../src/store/ride";
import { useSavedPlaces, type SavedKey } from "../../src/store/saved";
import { useTheme } from "../../src/theme/ThemeProvider";

/** Drop a pin: the rider moves the map under a pin fixed at the centre of the screen. */
export default function Pin() {
  const { field, saveAs } = useLocalSearchParams<{ field: "pickup" | "destination"; saveAs?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { pickup, destination, setPickup, setDestination } = useRide();
  const { save } = useSavedPlaces();
  const isPickup = field === "pickup";
  const start = (isPickup ? pickup : destination ?? pickup)?.location ?? serviceCenter();
  const [point, setPoint] = useState<LatLng>(start);
  const [label, setLabel] = useState("Move the map to place the pin");
  const [busy, setBusy] = useState(false);
  const ok = inServiceArea(point);

  const confirm = async () => {
    setBusy(true);
    const name = await describePoint(point);
    setBusy(false);
    const place = { id: `pin-${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`, name, subtitle: "Pinned on map", category: "pin" as const, location: point };
    if (saveAs) { save(saveAs as SavedKey, place); if (router.canDismiss()) router.dismiss(2); else router.replace("/"); return; }
    if (isPickup) { setPickup(place); goBack("/ride/search"); return; }
    setDestination(place);
    router.dismissTo("/ride/confirm");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <RideMap
        center={start}
        onCenterChange={(p) => {
          setPoint(p);
          describePoint(p).then(setLabel);
        }}
      />
      {/* The pin's tip sits exactly on the map's centre, which is the point we read back. */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ alignItems: "center", transform: [{ translateY: -27 }] }}>
          <View style={{ width: 40, height: 40, borderRadius: isPickup ? 20 : 12, backgroundColor: isPickup ? colors.green : colors.ink, alignItems: "center", justifyContent: "center" }}>
            {isPickup ? <KnotMark size={26} color={colors.greenInk} strokeWidth={10} /> : <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors.paper }} />}
          </View>
          <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: isPickup ? colors.green : colors.ink }} />
        </View>
        <View style={{ position: "absolute", width: 8, height: 4, borderRadius: 4, backgroundColor: colors.ink, opacity: 0.3 }} />
      </View>
      <MapButton name="back" label="Back" onPress={() => goBack("/ride/search")} style={{ left: 16, top: insets.top + 12 }} />

      <Sheet>
        <Txt variant="title">{saveAs ? "Pin the address" : isPickup ? "Set your pickup" : "Set your destination"}</Txt>
        <Txt color="muted" numberOfLines={2}>{ok ? label : "This spot is outside our service area. Move the pin closer to the city."}</Txt>
        <Button title={isPickup ? "Use this pickup" : "Use this spot"} onPress={confirm} disabled={!ok} loading={busy} />
      </Sheet>
    </View>
  );
}
