import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../../src/components/Icon";
import { KnotMark } from "../../../src/components/Knot";
import { DriverMarker } from "../../../src/components/map/markers";
import { frame, RideMap, type RideMapHandle } from "../../../src/components/map/RideMap";
import { RequestCard } from "../../../src/driver/components/RequestCard";
import { Sheet } from "../../../src/components/Sheet";
import { useTabBarHeight } from "../../../src/components/TabBar";
import { Button, MapButton, tap, Txt } from "../../../src/components/ui";
import { Glass, Stat } from "../../../src/components/visual";
import { LinearGradient } from "expo-linear-gradient";
import { fonts, glow } from "../../../src/theme/tokens";
import { formatNaira } from "../../../src/lib/pricing";
import { getEarnings } from "../../../src/driver/services/trips";
import { drivingBlockers, expiringSoon, useApplication } from "../../../src/driver/store/application";
import { useDriving } from "../../../src/driver/store/driving";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function Drive() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { application } = useApplication();
  const d = useDriving();
  const map = useRef<RideMapHandle>(null);
  const [sheetH, setSheetH] = useState(260);
  const [accepting, setAccepting] = useState(false);
  const [today, setToday] = useState<number | null>(null);
  const [tripsToday, setTripsToday] = useState(0);

  const blockers = drivingBlockers(application);
  const soon = expiringSoon(application);
  const vehicleType = application?.vehicleType ?? "keke";
  const firstName = application?.personal.fullName.split(" ")[0] ?? "";

  useFocusEffect(useCallback(() => {
    getEarnings().then((list) => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const todays = list.filter((t) => new Date(t.completedAt) >= start);
      setToday(todays.reduce((s, t) => s + t.fare, 0));
      setTripsToday(todays.length);
    }).catch(() => {});
  }, []));

  // Frame the driver, and the pickup too when a request comes in.
  useEffect(() => {
    const pts = d.request ? [d.position.location, d.request.pickup.location] : [d.position.location];
    frame(map.current, pts, { top: insets.top + 90, bottom: sheetH + 24 });
  }, [d.request?.id, sheetH, d.position.location.latitude, d.position.location.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (d.notice) { Alert.alert("Trip cancelled", d.notice); d.clearNotice(); }
  }, [d.notice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Going offline automatically if a document stops being valid.
  useEffect(() => { if (blockers.length && d.online) d.goOffline(); }, [blockers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goOnline = () => {
    if (blockers.length) {
      Alert.alert("You can't go online yet", blockers.map((b) => `${b.title}: ${b.reason}`).join("\n"), [
        { text: "Close", style: "cancel" },
        { text: "Update", onPress: () => router.push({ pathname: "/driver/document/[kind]", params: { kind: blockers[0].kind } }) },
      ]);
      return;
    }
    if (d.locationStatus === "denied") {
      Alert.alert("Turn on location", "Riders can only find you when your location is on.", [
        { text: "Close", style: "cancel" },
        { text: "Open settings", onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    d.goOnline(vehicleType);
  };

  const accept = async () => {
    setAccepting(true);
    try { await d.accept(); router.push("/driver/trip"); }
    catch (e: any) { Alert.alert("Couldn't accept", e?.message ?? "The rider may have cancelled."); }
    finally { setAccepting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <RideMap ref={map} center={d.position.location}>
        <DriverMarker coordinate={d.position.location} heading={d.position.heading} rideType={vehicleType} />
      </RideMap>

      {/* Status and today's earnings */}
      <View style={{ position: "absolute", top: insets.top + 10, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
        {d.online ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, ...glow(isDark) }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.greenInk }} />
            <Txt style={{ fontFamily: fonts.display, fontSize: 14, color: colors.greenInk }}>Online</Txt>
          </View>
        ) : (
          <Glass style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted }} />
            <Txt style={{ fontFamily: fonts.display, fontSize: 14 }}>Offline</Txt>
          </Glass>
        )}
        <Glass style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 14 }} tabular>Today {today === null ? "…" : formatNaira(today)}</Txt>
        </Glass>
        <View style={{ flex: 1 }} />
        <MapButton name="locate" label="Center on me" onPress={() => frame(map.current, [d.position.location], { top: insets.top + 90, bottom: sheetH + 24 })} style={{ position: "relative" }} />
      </View>

      {d.trip ? (
        <Pressable accessibilityRole="button" onPress={() => router.push("/driver/trip")}
          style={{ position: "absolute", left: 16, right: 16, top: insets.top + 68, backgroundColor: colors.green, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="navigate" color={colors.greenInk} />
          <Txt variant="bodyStrong" style={{ color: colors.greenInk, flex: 1 }} numberOfLines={1}>Trip with {d.trip.rider.name.split(" ")[0]} in progress</Txt>
          <Icon name="forward" size={18} color={colors.greenInk} />
        </Pressable>
      ) : null}

      <Sheet bottomOffset={tabH} onHeight={setSheetH} scroll maxHeightRatio={0.72}>
        {d.request ? (
          <RequestCard key={d.request.id} request={d.request} from={d.position.location} accepting={accepting} onAccept={accept} onDecline={() => { tap(); d.decline(); }} />
        ) : d.online ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Turning />
              <View style={{ flex: 1 }}>
                <Txt variant="title">Finding riders near you</Txt>
                <Txt color="muted">Keep the app open. New requests show up here.</Txt>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Stat value={String(tripsToday)} label="Trips today" />
              <Stat value={today === null ? "…" : formatNaira(today)} label="Earned today" />
            </View>
            <Button title="Go offline" variant="quiet" icon="power" onPress={d.goOffline} />
          </>
        ) : (
          <>
            {blockers.length ? (
              <Banner tone="red" text={`You can't go online: ${blockers.map((b) => `${b.title.toLowerCase()} ${b.reason}`).join(", ")}.`} action="Update now"
                onPress={() => router.push({ pathname: "/driver/document/[kind]", params: { kind: blockers[0].kind } })} />
            ) : soon.length ? (
              <Banner tone="amber" text={`Your ${soon[0].title.toLowerCase()} expires in ${soon[0].days} day${soon[0].days === 1 ? "" : "s"}. Upload the renewed one to keep driving.`} action="Update"
                onPress={() => router.push({ pathname: "/driver/document/[kind]", params: { kind: soon[0].kind } })} />
            ) : null}
            <GoButton onPress={goOnline} disabled={!!blockers.length} />
            <View style={{ alignItems: "center", gap: 4, marginTop: 4 }}>
              <Txt variant="title">Sannu, {firstName}. You're offline</Txt>
              <Txt color="muted" align="center">Tap GO to get {vehicleType === "keke" ? "keke" : "car"} requests near you</Txt>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Stat value={String(tripsToday)} label="Trips today" />
              <Stat value={today === null ? "…" : formatNaira(today)} label="Earned today" />
            </View>
            {d.locationStatus === "demo" ? <Txt variant="caption" color="muted">Sample mode: you're outside Sokoto, so Sokoto's places have been moved around you. Requests start a few seconds after you go online.</Txt> : null}
            {d.locationStatus === "outside" ? <Txt variant="caption" color="muted">You're outside Sokoto. You'll get requests when you're in the service area.</Txt> : null}
          </>
        )}
      </Sheet>
    </View>
  );
}

function Banner({ text, action, onPress, tone }: { text: string; action: string; onPress: () => void; tone: "red" | "amber" }) {
  const { colors } = useTheme();
  const bg = tone === "red" ? colors.dangerSoft : colors.amberSoft;
  const fg = tone === "red" ? colors.danger : colors.amberText;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 18, padding: 14, gap: 6 }}>
      <Txt variant="bodyStrong" style={{ color: fg }}>{text}</Txt>
      <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} hitSlop={6}><Txt variant="label" style={{ color: fg, textDecorationLine: "underline" }}>{action}</Txt></Pressable>
    </View>
  );
}

function Turning() {
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

/** The big GO button, with two soft rings that pulse outward. */
function GoButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { colors, isDark } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (disabled) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }), -1, false);
  }, [disabled, pulse]);
  const r1 = useAnimatedStyle(() => {
    const p = pulse.value % 1;
    return { opacity: disabled ? 0 : 0.35 * (1 - p), transform: [{ scale: 1 + p * 0.45 }] };
  });
  const r2 = useAnimatedStyle(() => {
    const p = (pulse.value + 0.5) % 1;
    return { opacity: disabled ? 0 : 0.35 * (1 - p), transform: [{ scale: 1 + p * 0.45 }] };
  });
  return (
    <View style={{ alignSelf: "center", width: 176, height: 176, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
      <Animated.View style={[{ position: "absolute", width: 132, height: 132, borderRadius: 66, backgroundColor: colors.green }, r1]} />
      <Animated.View style={[{ position: "absolute", width: 132, height: 132, borderRadius: 66, backgroundColor: colors.green }, r2]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go online"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => { tap(); onPress(); }}
        style={({ pressed }) => ({ width: 132, height: 132, borderRadius: 66, overflow: "hidden", opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.95 : 1 }], ...glow(isDark) })}
      >
        <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
          <Icon name="power" size={30} color="#FFFFFF" />
          <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 24, color: "#FFFFFF", letterSpacing: 1 }}>GO</Txt>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
