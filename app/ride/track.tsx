import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Share, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KnotMark } from "../../src/components/Knot";
import { Missing } from "../../src/components/Missing";
import { DriverMarker, DropPin, PickupPin, RouteLine } from "../../src/components/map/markers";
import { frame, RideMap, type RideMapHandle } from "../../src/components/map/RideMap";
import { RouteSummary } from "../../src/components/PlaceRow";
import { Sheet } from "../../src/components/Sheet";
import { Avatar, Button, IconButton, MapButton, Plate, Txt } from "../../src/components/ui";
import { Glass, Tag } from "../../src/components/visual";
import { fonts } from "../../src/theme/tokens";
import { ENV } from "../../src/config/env";
import { BRAND } from "../../src/config/brand";
import { useSmoothPosition } from "../../src/hooks/useSmoothPosition";
import { haversineKm, trimPathFrom } from "../../src/lib/geo";
import { paymentOption } from "../../src/lib/payments";
import { formatNaira } from "../../src/lib/pricing";
import { useRide } from "../../src/store/ride";
import { useTheme } from "../../src/theme/ThemeProvider";

const KMH = { keke: 20, car: 26 } as const;
const ROAD_FACTOR = 1.3; // straight line → road distance, for ETAs between GPS updates

/** Height the sheet can be pulled down to (trip status), to see more of the map. */
const PEEK = 230;

export default function Track() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeRide: ride, driverPosition, online, cancelActiveRide } = useRide();
  const map = useRef<RideMapHandle>(null);
  const [sheetH, setSheetH] = useState(380);
  const [cancelling, setCancelling] = useState(false);
  const smooth = useSmoothPosition(driverPosition?.location ?? null, driverPosition?.heading ?? 0, 900);
  const startKm = useRef<number | null>(null);

  const status = ride?.status;
  useEffect(() => {
    if (status === "completed") router.replace("/ride/complete");
    startKm.current = null;
  }, [status]);

  // Re-frame when the status changes or the driver first appears; after that the rider can pan freely.
  const hasDriver = !!driverPosition;
  useEffect(() => {
    if (!ride) return;
    const d = driverPosition?.location;
    const pts =
      status === "searching" ? [ride.pickup.location]
      : status === "in_progress" ? [d ?? ride.pickup.location, ride.destination.location]
      : d ? [d, ride.pickup.location] : [ride.pickup.location];
    frame(map.current, pts, { top: insets.top + 80, bottom: sheetH + 24 });
  }, [status, hasDriver, sheetH]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ride) return <Missing message="You don't have a ride in progress." />;

  const driver = ride.driver;
  const kind = ride.rideType === "keke" ? "keke" : "car";
  const car = smooth?.location;
  const target = status === "in_progress" ? ride.destination.location : ride.pickup.location;
  const remainingKm = car ? haversineKm(car, target) * ROAD_FACTOR : null;
  if (remainingKm !== null && startKm.current === null) startKm.current = remainingKm;
  const etaMin = remainingKm !== null ? Math.max(1, Math.ceil((remainingKm / KMH[ride.rideType]) * 60)) : null;
  const progress = remainingKm !== null && startKm.current ? 1 - remainingKm / startKm.current : 0;
  const arriveBy = etaMin ? new Date(Date.now() + etaMin * 60000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  const routeLeft = status === "in_progress" && car ? trimPathFrom(ride.route, car) : status === "accepted" && car ? [car, ride.pickup.location] : [];

  const shareTrip = () =>
    Share.share({ message: `I'm on a ${BRAND.name} trip to ${ride.destination.name}${driver ? ` with ${driver.name} (${driver.vehicle.plate})` : ""}. Follow it live: ${ENV.shareBaseUrl}/${ride.id}` });
  const safety = () =>
    Alert.alert("Safety", "If you're in danger, call 112 now.", [
      { text: "Call 112", style: "destructive", onPress: () => Linking.openURL("tel:112") },
      { text: "Share trip with family", onPress: shareTrip },
      { text: "Close", style: "cancel" },
    ]);
  const cancel = () =>
    Alert.alert("Cancel this ride?", status === "searching" ? "We'll stop looking for a driver." : "Your driver is already on the way.", [
      { text: "Keep ride", style: "cancel" },
      { text: "Cancel ride", style: "destructive", onPress: async () => {
        setCancelling(true);
        try { await cancelActiveRide(); router.replace("/(tabs)"); }
        catch (e: any) { Alert.alert("Couldn't cancel", e?.message ?? "Try again."); }
        finally { setCancelling(false); }
      } },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <RideMap ref={map} center={ride.pickup.location}>
        <RouteLine path={routeLeft} />
        {status !== "in_progress" && <PickupPin coordinate={ride.pickup.location} />}
        {status === "in_progress" && <DropPin coordinate={ride.destination.location} />}
        {car && status !== "searching" && <DriverMarker coordinate={car} heading={smooth?.heading ?? 0} rideType={ride.rideType} />}
      </RideMap>
      <View style={{ position: "absolute", top: insets.top + 10, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MapButton name="back" label="Back to home" onPress={() => router.navigate("/(tabs)")} style={{ position: "relative" }} />
        {driver && status !== "searching" ? (
          <Glass style={{ borderRadius: 999, paddingVertical: 11, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.greenSoft }} />
            <Txt style={{ fontFamily: fonts.display, fontSize: 13 }} numberOfLines={1}>
              {status === "arrived" ? `${driver.name.split(" ")[0]} is at your pickup` : status === "in_progress" ? "On your way" : `${driver.name.split(" ")[0]} is on the way`}
            </Txt>
          </Glass>
        ) : null}
      </View>

      <Sheet onHeight={setSheetH} scroll peek={PEEK}>
        {!online ? <Txt variant="caption" style={{ color: colors.danger }}>Reconnecting… your driver's position will update when you're back online.</Txt> : null}

        {status === "searching" && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Spinner />
              <View style={{ flex: 1 }}>
                <Txt variant="title">Finding a {kind} near you</Txt>
                <Txt color="muted">Drivers near {ride.pickup.subtitle?.replace(/^Near /, "") ?? ride.pickup.name} can see your request.</Txt>
              </View>
            </View>
            <RouteSummary from={ride.pickup.name} to={ride.destination.name} />
            <Button title="Cancel request" variant="danger" onPress={cancel} loading={cancelling} />
          </>
        )}

        {(status === "accepted" || status === "arrived" || status === "in_progress") && driver && (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1 }}>
                {status === "arrived" ? (
                  <>
                    <Txt variant="eta">Here</Txt>
                    <Txt color="muted">{driver.name.split(" ")[0]} is waiting at the pickup. Look for {driver.vehicle.plate}.</Txt>
                  </>
                ) : (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                      <Txt variant="eta" tabular>{etaMin ?? "–"}</Txt>
                      <Txt variant="button" color="muted" style={{ fontSize: 18 }}>{status === "in_progress" ? "min to go" : "min away"}</Txt>
                    </View>
                    <Txt color="muted">
                      {status === "in_progress" ? `Heading to ${ride.destination.name}${arriveBy ? ` · arrive by ${arriveBy}` : ""}` : `${driver.name.split(" ")[0]} is on the way to your pickup`}
                    </Txt>
                  </>
                )}
              </View>
              <Plate text={driver.vehicle.plate} />
            </View>
            {/* Trip stages: accepted · on the way · arrived · on trip */}
            <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel={`Progress: ${status === "in_progress" ? "on the trip" : status === "arrived" ? "driver arrived" : "driver on the way"}`}>
              {[0, 1, 2, 3].map((i) => {
                const stage = status === "accepted" ? 1 : status === "arrived" ? 2 : 3;
                const part = i < stage ? 1 : i === stage ? (status === "arrived" ? 0 : progress) : 0;
                return (
                  <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round(part * 100)}%`, height: "100%", backgroundColor: colors.green, borderRadius: 3 }} />
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.mist, borderRadius: 22, padding: 12, borderWidth: 1, borderColor: colors.line }}>
              <Avatar name={driver.name} size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Txt style={{ fontFamily: fonts.display, fontSize: 16 }} numberOfLines={1}>{driver.name}</Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Tag text={`★ ${driver.rating.toFixed(1)}`} tone="amber" />
                  <Txt variant="caption" color="muted" numberOfLines={1} style={{ flex: 1 }}>{driver.vehicle.color} {driver.vehicle.make}</Txt>
                </View>
              </View>
            </View>

            {status === "in_progress" ? (
              <Txt variant="caption" color="muted" tabular>{formatNaira(ride.fare)} · {paymentOption(ride.paymentMethod).label}</Txt>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[
                { icon: "phone" as const, label: "Call", onPress: () => Linking.openURL(`tel:${driver.phone}`) },
                { icon: "chat" as const, label: "Message", onPress: () => Linking.openURL(`sms:${driver.phone}`) },
                { icon: "share" as const, label: "Share trip", onPress: shareTrip },
                { icon: "shield" as const, label: "Safety", onPress: safety, danger: true },
              ].map((a) => (
                <View key={a.label} style={{ alignItems: "center", gap: 6, flex: 1 }}>
                  <IconButton name={a.icon} label={a.label} size={54} onPress={a.onPress} tone={a.danger ? "danger" : undefined} />
                  <Txt variant="label" color="muted" style={{ fontSize: 12 }}>{a.label}</Txt>
                </View>
              ))}
            </View>
            {status !== "in_progress" && <Button title="Cancel ride" variant="quiet" onPress={cancel} loading={cancelling} />}
          </>
        )}

        {(status === "no_drivers" || status === "cancelled") && (
          <>
            <Txt variant="title">{status === "no_drivers" ? "No drivers free right now" : "Your driver cancelled"}</Txt>
            <Txt color="muted">{status === "no_drivers" ? "All nearby drivers are busy. Try again in a few minutes, or switch between Keke and Car." : "Sorry about that. You haven't been charged. Request again and we'll find another driver."}</Txt>
            <Button title="Try again" onPress={() => router.replace("/ride/confirm")} />
            <Button title="Back to home" variant="quiet" onPress={() => router.replace("/(tabs)")} />
          </>
        )}
      </Sheet>
    </View>
  );
}

/** The knot turning slowly while we look for a driver. */
function Spinner() {
  const { colors } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }), -1, false); }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 360}deg` }] }));
  return (
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={style}><KnotMark size={38} color={colors.greenText} strokeWidth={9} /></Animated.View>
    </View>
  );
}
