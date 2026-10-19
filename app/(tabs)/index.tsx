import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../src/components/Icon";
import { UserDot } from "../../src/components/map/markers";
import { frame, RideMap, type RideMapHandle } from "../../src/components/map/RideMap";
import { Sheet } from "../../src/components/Sheet";
import { useTabBarHeight } from "../../src/components/TabBar";
import { Avatar, Chip, MapButton, tap, Txt } from "../../src/components/ui";
import { Glass, PlaceBadge, VehicleArt } from "../../src/components/visual";
import { popular, SHORT_NAMES } from "../../src/data/landmarks";
import { useCurrentLocation } from "../../src/hooks/useCurrentLocation";
import { haversineKm } from "../../src/lib/geo";
import type { RideTypeId } from "../../src/lib/pricing";
import { formatNaira } from "../../src/lib/pricing";
import { describePoint } from "../../src/services/places";
import { useRide } from "../../src/store/ride";
import { useSavedPlaces, type SavedKey } from "../../src/store/saved";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts, glow, radius, shadow } from "../../src/theme/tokens";
import type { Place } from "../../src/types";

/** Visible height of the pulled-down sheet above the tab bar: grab handle + the "Where to?" bar. */
const PEEK_ABOVE_TABS = 24 + 4 + 62 + 14;

export default function Home() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { user } = useSession();
  const { saved } = useSavedPlaces();
  const { pickup, setPickup, setDestination, setRideType, activeRide, pricing } = useRide();
  const here = useCurrentLocation();
  const map = useRef<RideMapHandle>(null);
  const [sheetH, setSheetH] = useState(420);

  // Keep the pickup on "Current location" until the rider picks something else.
  useEffect(() => {
    if (here.status === "loading") return;
    if (pickup && pickup.id !== "current") return;
    let live = true;
    describePoint(here.location).then((label) => {
      if (live) setPickup({ id: "current", name: "Current location", subtitle: label, category: "pin", location: here.location });
    });
    return () => { live = false; };
  }, [here.status, here.location.latitude, here.location.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const center = () => frame(map.current, [here.location], { top: insets.top + 90, bottom: sheetH + 20 });
  useEffect(() => { center(); }, [here.location.latitude, here.location.longitude, sheetH]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (place: Place) => { setDestination(place); router.push("/ride/confirm"); };
  const openSaved = (key: SavedKey) => {
    const p = saved[key];
    if (p) goTo(p);
    else router.push({ pathname: "/ride/search", params: { saveAs: key } });
  };
  const pickType = (t: RideTypeId) => { tap(); setRideType(t); router.push("/ride/search"); };
  const firstName = user?.name.split(" ")[0] ?? "";
  // A ride still in progress, or one that ended but wasn't wrapped up (e.g. the rider pressed back on the trip summary).
  const rideOpen = activeRide && !["cancelled", "no_drivers"].includes(activeRide.status);
  const rideEnded = activeRide?.status === "completed";

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <RideMap ref={map} center={here.location}>
        <UserDot coordinate={here.location} />
      </RideMap>

      {/* Frosted header over the map */}
      <View style={{ position: "absolute", top: insets.top + 10, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Glass style={{ flex: 1, borderRadius: 999, paddingVertical: 6, paddingLeft: 6, paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar name={user?.name ?? ""} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 14 }} numberOfLines={1}>Sannu, {firstName}</Txt>
            <Txt variant="caption" color="muted" numberOfLines={1} style={{ fontSize: 12 }}>{pickup?.subtitle ?? "Finding you…"}</Txt>
          </View>
        </Glass>
        <MapButton name="locate" label="Center on my location" onPress={() => { here.refresh(); center(); }} style={{ position: "relative" }} />
      </View>

      {rideOpen ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(rideEnded ? "/ride/complete" : "/ride/track")}
          style={{ position: "absolute", left: 16, right: 16, top: insets.top + 74, backgroundColor: colors.green, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, ...glow(isDark) }}>
          <Icon name="keke" color={colors.greenInk} />
          <Txt variant="bodyStrong" style={{ color: colors.greenInk, flex: 1 }} numberOfLines={1}>
            {rideEnded ? (activeRide!.paymentStatus === "paid" ? "Trip ended · rate your ride" : "Trip ended · finish paying") : `Ride to ${activeRide!.destination.name}`}
          </Txt>
          <Icon name="forward" size={18} color={colors.greenInk} />
        </Pressable>
      ) : null}

      {/* Pull the sheet down to see the whole map; the "Where to?" bar stays above the tab bar. */}
      <Sheet bottomOffset={tabH} onHeight={setSheetH} scroll maxHeightRatio={0.72} peek={PEEK_ABOVE_TABS + tabH}>
        {/* Search */}
        <Pressable accessibilityRole="button" accessibilityLabel="Where to?" onPress={() => { tap(); router.push("/ride/search"); }}
          style={({ pressed }) => ({ height: 62, borderRadius: 20, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 18, paddingRight: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Icon name="search" color={colors.greenText} />
          <Txt style={{ fontFamily: fonts.display, fontSize: 17, flex: 1 }}>Where to?</Txt>
          <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", ...glow(isDark) }}>
            <Icon name="arrow" size={20} color={colors.greenInk} />
          </View>
        </Pressable>

        {/* Ride types */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {(["keke", "car"] as const).map((t, i) => {
            const cfg = pricing.rideTypes.find((r) => r.id === t);
            const rate = cfg?.ratePerKm ?? pricing.ratePerKm;
            return (
              <Animated.View key={t} entering={FadeInDown.duration(400).delay(80 + i * 70)} style={{ flex: 1 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t === "keke" ? "Keke" : "Car"}, ${formatNaira(rate)} per km`} onPress={() => pickType(t)}
                  style={({ pressed }) => ({ borderRadius: 22, padding: 12, paddingBottom: 14, backgroundColor: colors.greenSoft, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <View style={{ marginLeft: -4, marginTop: -2 }}><VehicleArt type={t} width={104} /></View>
                  <Txt style={{ fontFamily: fonts.display, fontSize: 16 }}>{t === "keke" ? "Keke" : "Car"}</Txt>
                  <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }} tabular>{cfg?.seats ?? (t === "keke" ? 3 : 4)} seats · {formatNaira(rate)}/km</Txt>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Saved places */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip icon="home" label={saved.home ? "Home" : "Add home"} onPress={() => openSaved("home")} />
          <Chip icon="work" label={saved.work ? "Work" : "Add work"} onPress={() => openSaved("work")} />
        </View>

        {/* Popular places */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt variant="heading">Popular in Sokoto</Txt>
          <Pressable accessibilityRole="button" onPress={() => router.push("/ride/search")} hitSlop={8}><Txt variant="label" color="muted">See all</Txt></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}>
          {popular().map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => { tap(); goTo(p); }}
              style={({ pressed }) => ({ width: 140, borderRadius: 20, padding: 12, gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, ...shadow(1, isDark), transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <PlaceBadge category={p.category} />
              <Txt style={{ fontFamily: fonts.display, fontSize: 14, lineHeight: 18 }} numberOfLines={2}>{SHORT_NAMES[p.id] ?? p.name}</Txt>
              <Txt variant="label" color="muted" tabular style={{ fontSize: 12 }}>{(haversineKm(here.location, p.location) * 1.25).toFixed(1)} km</Txt>
            </Pressable>
          ))}
        </ScrollView>

        {here.status === "denied" ? (
          <Notice text="Location is off, so the map starts in central Sokoto." action="Turn on location" onPress={() => Linking.openSettings()} />
        ) : here.status === "outside" ? (
          <Notice text="Caliphate Rides works in Sokoto city. Choose a pickup in Sokoto to book a ride." />
        ) : here.status === "demo" ? (
          <Notice text="Sample mode: Sokoto's places have been moved around you. Distances and fares stay the same." />
        ) : null}
      </Sheet>
    </View>
  );
}

function Notice({ text, action, onPress }: { text: string; action?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10, backgroundColor: colors.mist, borderRadius: radius.field, padding: 12, alignItems: "center", borderWidth: 1, borderColor: colors.line }}>
      <Icon name="alert" size={20} color={colors.muted} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="caption" color="muted">{text}</Txt>
        {action && onPress ? <Pressable onPress={onPress} accessibilityRole="button"><Txt variant="label" color="greenText">{action}</Txt></Pressable> : null}
      </View>
    </View>
  );
}
