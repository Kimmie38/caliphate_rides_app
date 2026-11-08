import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pill } from "../../src/driver/components/form";
import { DriverMarker, DropPin, PickupPin, RouteLine } from "../../src/components/map/markers";
import { frame, RideMap, type RideMapHandle } from "../../src/components/map/RideMap";
import { Missing } from "../../src/components/Missing";
import { Sheet } from "../../src/components/Sheet";
import { Avatar, Button, IconButton, MapButton, Txt } from "../../src/components/ui";
import { Glass } from "../../src/components/visual";
import { DEMO } from "../../src/config/demo";
import { useLiveRoute } from "../../src/hooks/useLiveRoute";
import { haversineKm, pathLengthKm, pointAlong, type LatLng } from "../../src/lib/geo";
import { isInApp, paymentOption } from "../../src/lib/payments";
import { fareBreakdown, formatNaira } from "../../src/lib/pricing";
import { useApplication } from "../../src/driver/store/application";
import { useDriving } from "../../src/driver/store/driving";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";

/** Opens turn-by-turn directions in Google Maps (or Apple Maps on iPhone). */
function navigateTo(p: LatLng) {
  const dest = `${p.latitude},${p.longitude}`;
  const native = Platform.OS === "ios" ? `maps://?daddr=${dest}&dirflg=d` : `google.navigation:q=${dest}`;
  Linking.openURL(native).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`));
}

/** Sample mode: how far the car moves along the route every 200 ms (about 200 km/h, so a trip takes seconds). */
const DEMO_STEP_KM = 0.011;

/** Height the sheet can be pulled down to (trip status), to see more of the map. */
const PEEK = 230;

export default function TripScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { trip, position, advance, confirmReceived, finishTrip } = useDriving();
  const { application } = useApplication();
  const map = useRef<RideMapHandle>(null);
  const [sheetH, setSheetH] = useState(320);
  const [busy, setBusy] = useState(false);
  const [waitedSec, setWaitedSec] = useState(0);

  const stage = trip?.stage;

  // Sample mode: the car drives itself along the road route, so you can watch the line shrink.
  const [demoPos, setDemoPos] = useState<LatLng | null>(null);
  const pos = demoPos ?? position.location;

  // Live road route for the leg being driven: to the pickup, then to the destination.
  const driving = stage === "to_pickup" || stage === "in_progress";
  const legTarget = !trip || !driving ? null : stage === "in_progress" ? trip.destination.location : trip.pickup.location;
  const live = useLiveRoute(driving ? pos : null, legTarget, stage === "in_progress" ? trip?.route : undefined);
  const pathRef = useRef(live.path);
  pathRef.current = live.path;

  useEffect(() => {
    if (!DEMO || !driving) return;
    const t = setInterval(() => {
      const path = pathRef.current;
      if (path.length < 2 || pathLengthKm(path) < 0.015) return; // no route yet, or already there
      setDemoPos(pointAlong(path, DEMO_STEP_KM).point);
    }, 200);
    return () => clearInterval(t);
  }, [driving, stage]);

  useEffect(() => {
    if (!trip) return;
    const pts = live.path.length > 1 ? live.path
      : stage === "in_progress" || stage === "payment" ? trip.route : [pos, trip.pickup.location];
    frame(map.current, pts, { top: insets.top + 80, bottom: sheetH + 24 });
  }, [stage, sheetH, live.version]); // eslint-disable-line react-hooks/exhaustive-deps

  // Waiting time at the pickup.
  useEffect(() => {
    if (stage !== "arrived") return;
    setWaitedSec(0);
    const t = setInterval(() => setWaitedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  if (!trip) return <Missing message="You don't have a trip in progress." home="/driver" />;

  const rider = trip.rider;
  const first = rider.name.split(" ")[0];
  const pay = paymentOption(trip.paymentMethod);
  const step = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e: any) { Alert.alert("Something went wrong", e?.message ?? "Try again."); } finally { setBusy(false); } };
  const toPickupKm = stage === "to_pickup" && live.remainingKm !== null ? live.remainingKm : haversineKm(pos, trip.pickup.location) * 1.3;
  const carAt = live.position ?? pos;
  const carHeading = live.heading ?? position.heading;
  const bank = application?.bank;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <RideMap ref={map} center={pos}>
        <RouteLine path={driving ? live.path : []} />
        {stage === "to_pickup" || stage === "arrived"
          ? <PickupPin coordinate={trip.pickup.location} label={stage === "to_pickup" && live.etaMin ? `${live.etaMin} min` : undefined} />
          : <DropPin coordinate={trip.destination.location} label={stage === "in_progress" && live.etaMin ? `${live.etaMin} min` : undefined} />}
        <DriverMarker coordinate={carAt} heading={carHeading} rideType={trip.rideType} />
      </RideMap>
      {DEMO && driving ? (
        <Glass style={{ position: "absolute", top: insets.top + 14, left: 72, right: 16, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Txt variant="caption" numberOfLines={1}>Sample mode: the car drives itself along the route</Txt>
        </Glass>
      ) : null}
      <MapButton name="back" label="Back to Drive" onPress={() => router.navigate("/driver")} style={{ left: 16, top: insets.top + 12 }} />

      <Sheet onHeight={setSheetH} scroll peek={PEEK}>
        {stage !== "payment" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={rider.name} size={48} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{rider.name}</Txt>
              <Txt variant="caption" color="muted">★ {rider.rating.toFixed(1)} · {formatNaira(trip.fare)} · {isInApp(trip.paymentMethod) ? `paid in app (${pay.label.toLowerCase()})` : pay.id === "cash" ? "collect cash" : "bank transfer to you"}</Txt>
            </View>
            <IconButton name="phone" label={`Call ${first}`} onPress={() => Linking.openURL(`tel:${rider.phone}`)} />
          </View>
        )}

        {stage === "to_pickup" && (
          <>
            <View>
              <Txt variant="title">Pick up {first}</Txt>
              <Txt color="muted">{trip.pickup.name}{trip.pickup.subtitle ? ` · ${trip.pickup.subtitle}` : ""}</Txt>
              <Txt variant="caption" color="muted" tabular>{toPickupKm.toFixed(1)} km away</Txt>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Directions" icon="navigate" variant="outline" onPress={() => navigateTo(trip.pickup.location)} style={{ flex: 1 }} />
              <Button title="I've arrived" onPress={() => step(() => advance("arrived"))} loading={busy} style={{ flex: 1 }} />
            </View>
          </>
        )}

        {stage === "arrived" && (
          <>
            <View>
              <Txt variant="title">Waiting for {first}</Txt>
              <Txt color="muted" tabular>We told {first} you're here · {Math.floor(waitedSec / 60)}:{String(waitedSec % 60).padStart(2, "0")}</Txt>
            </View>
            <Button title="Start trip" onPress={() => step(() => advance("in_progress"))} loading={busy} />
          </>
        )}

        {stage === "in_progress" && (
          <>
            <View>
              <Txt variant="title">Drop off at {trip.destination.name}</Txt>
              <Txt variant="caption" color="muted" tabular>{trip.distanceKm.toFixed(1)} km trip · about {trip.durationMin} min</Txt>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Directions" icon="navigate" variant="outline" onPress={() => navigateTo(trip.destination.location)} style={{ flex: 1 }} />
              <Button title="Complete trip" onPress={() => step(() => advance("payment"))} loading={busy} style={{ flex: 1 }} />
            </View>
          </>
        )}

        {stage === "payment" && (
          <>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Pill text={isInApp(trip.paymentMethod) ? "Paid in the app" : "Paid to you directly"} tone={isInApp(trip.paymentMethod) ? "green" : "amber"} />
              <Txt variant="total" tabular>{formatNaira(trip.fare)}</Txt>
              <Txt variant="caption" color="muted" tabular>{fareBreakdown(trip)}</Txt>
              <Txt variant="caption" color="greenText" tabular style={{ fontFamily: fonts.bodyBold }}>
                Your share {formatNaira(trip.driverEarning)} · {trip.commissionPercent}% commission {formatNaira(trip.commission)}
              </Txt>
            </View>

            {trip.paymentStatus === "paid" ? (
              <View style={{ backgroundColor: colors.greenSoft, borderRadius: 14, padding: 14, gap: 4 }}>
                <Txt variant="bodyStrong" color="greenText">
                  {trip.paymentMethod === "wallet" ? `Paid from ${first}'s wallet` : trip.paymentMethod === "card" ? `${first} paid by card` : trip.paymentMethod === "cash" ? "Cash received" : "Transfer received"}
                </Txt>
                <Txt variant="caption" color="muted">
                  {isInApp(trip.paymentMethod)
                    ? `${formatNaira(trip.driverEarning)} has been added to your balance. Withdraw it from Earnings.`
                    : `You collected this directly. The ${formatNaira(trip.commission)} commission comes off your balance.`}
                </Txt>
              </View>
            ) : trip.paymentMethod === "card" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color={colors.green} />
                <Txt color="muted" style={{ flex: 1 }}>Waiting for {first} to pay by card</Txt>
              </View>
            ) : trip.paymentMethod === "cash" ? (
              <>
                <Txt variant="title" align="center">Collect {formatNaira(trip.fare)} in cash from {first}</Txt>
                <Button title="Cash received" onPress={() => step(confirmReceived)} loading={busy} />
              </>
            ) : (
              <>
                <Txt variant="title" align="center">{first} is sending {formatNaira(trip.fare)} to your account</Txt>
                {bank ? <Txt color="muted" align="center">{bank.bankName} · {bank.accountNumber} · {bank.accountName}</Txt> : null}
                <Txt variant="caption" color="muted" align="center">Check your bank app or SMS alert, then confirm.</Txt>
                <Button title="Transfer received" onPress={() => step(confirmReceived)} loading={busy} />
                <Button title="It hasn't arrived" variant="quiet" onPress={() => Alert.alert("Transfer not in yet", "Transfers can take a few minutes. Ask the rider to show you the debit alert. If it still doesn't arrive, report it from Account → Help and we'll follow up with the rider.")} />
              </>
            )}

            <Button title="Finish and go back online" variant={trip.paymentStatus === "paid" ? "primary" : "outline"} disabled={trip.paymentStatus !== "paid"}
              onPress={() => { finishTrip(); router.navigate("/driver"); }} />
          </>
        )}
      </Sheet>
    </View>
  );
}
