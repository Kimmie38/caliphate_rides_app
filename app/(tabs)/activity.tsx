import { router, useFocusEffect } from "expo-router";
import { errorText } from "../../src/services/http";
import React, { useCallback, useMemo, useState } from "react";
import { LayoutAnimation, Platform, Pressable, RefreshControl, ScrollView, UIManager, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../src/components/Icon";
import { useTabBarHeight } from "../../src/components/TabBar";
import { Avatar, Button, Segmented, tap, Txt } from "../../src/components/ui";
import { Badge, Card, Hero, VehicleArt } from "../../src/components/visual";
import { formatDayMonth, formatTime, t, useI18n } from "../../src/i18n";
import { isInApp, paymentOption } from "../../src/lib/payments";
import { formatKm, formatNaira } from "../../src/lib/pricing";
import { getHistory } from "../../src/services/rides";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";
import type { TripSummary } from "../../src/types";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Filter = "all" | "keke" | "car";
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday" or "8 Nov". */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);
  if (diff === 0) return t("Today");
  if (diff === 1) return t("Yesterday");
  return formatDayMonth(d);
}

/** The rider's trips: a monthly summary, then each day's trips. Tap a trip for its details. */
export default function Activity() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setTrips(await getHistory()); setError(null); }
    catch (e: any) { setError(errorText(e, t("Couldn't load your trips."))); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => (trips ?? []).filter((x) => filter === "all" || x.rideType === filter), [trips, filter]);
  const groups = useMemo(() => {
    const out: { label: string; items: TripSummary[] }[] = [];
    for (const x of shown) {
      const label = dayLabel(x.completedAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(x);
      else out.push({ label, items: [x] });
    }
    return out;
  }, [shown]);

  // This month's totals.
  const month = useMemo(() => {
    const now = new Date();
    const list = (trips ?? []).filter((x) => { const d = new Date(x.completedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    return { count: list.length, spent: list.reduce((s, x) => s + x.fare, 0), km: list.reduce((s, x) => s + x.distanceKm, 0) };
  }, [trips]);

  const toggle = (id: string) => {
    tap();
    LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
    setOpen((o) => (o === id ? null : id));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.green} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={{ gap: 2 }}>
        <Txt variant="page">{t("Your trips")}</Txt>
        <Txt color="muted">{t("Every ride you've taken with Caliphate Rides")}</Txt>
      </View>

      {/* Monthly summary */}
      <Animated.View entering={FadeInDown.duration(380)}>
        <Hero glowing style={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#FFFFFF", opacity: 0.85, letterSpacing: 0.6 }}>{t("THIS MONTH")}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Icon name="receipt" size={13} color="#FFFFFF" />
              <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: "#FFFFFF" }}>{month.count === 1 ? t("1 trip") : t("{0} trips", month.count)}</Txt>
            </View>
          </View>
          <View>
            <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 34, color: "#FFFFFF" }} tabular>{formatNaira(month.spent)}</Txt>
            <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF", opacity: 0.85 }}>{t("spent on rides")}</Txt>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <HeroStat icon="route" value={formatKm(month.km)} label={t("travelled")} />
            <HeroStat icon="time" value={month.count ? formatNaira(Math.round(month.spent / month.count)) : "–"} label={t("average fare")} />
          </View>
        </Hero>
      </Animated.View>

      <Segmented<Filter> value={filter} onChange={(f) => { setFilter(f); setOpen(null); }}
        options={[{ value: "all", label: t("All") }, { value: "keke", label: t("Keke") }, { value: "car", label: t("Car") }]} />

      {trips === null && !error ? (
        <View style={{ gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} />)}</View>
      ) : error ? (
        <Card style={{ gap: 12, alignItems: "center" }}>
          <Badge icon="alert" tone="health" />
          <Txt align="center" style={{ color: colors.danger }}>{error}</Txt>
          <Button title={t("Try again")} variant="soft" onPress={load} />
        </Card>
      ) : shown.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
          <View style={{ width: 140, height: 90, borderRadius: 26, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
            <VehicleArt type={filter === "car" ? "car" : "keke"} width={118} />
          </View>
          <Txt variant="heading" align="center">{filter === "all" ? t("No trips yet") : filter === "keke" ? t("No keke trips yet") : t("No car trips yet")}</Txt>
          <Txt color="muted" align="center">{t("Your rides show up here after your first trip.")}</Txt>
          <Button title={t("Book a ride")} icon="search" onPress={() => router.navigate("/(tabs)")} style={{ alignSelf: "stretch", marginTop: 6 }} />
        </Card>
      ) : (
        groups.map((g, gi) => (
          <Animated.View key={g.label} entering={FadeInDown.duration(350).delay(60 + gi * 50)} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
              <Txt variant="label" color="muted" style={{ fontFamily: fonts.bodyBold }}>{g.label}</Txt>
              <Txt variant="caption" color="muted" tabular>{formatNaira(g.items.reduce((s, x) => s + x.fare, 0))}</Txt>
            </View>
            {g.items.map((x) => <TripCard key={x.id} trip={x} open={open === x.id} onPress={() => toggle(x.id)} />)}
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

function HeroStat({ icon, value, label }: { icon: React.ComponentProps<typeof Icon>["name"]; value: string; label: string }) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, padding: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontFamily: fonts.display, fontSize: 15, color: "#FFFFFF" }} numberOfLines={1} tabular>{value}</Txt>
        <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: "#FFFFFF", opacity: 0.8 }} numberOfLines={1}>{label}</Txt>
      </View>
    </View>
  );
}

/** One trip: the route from pickup to destination, fare and payment. Opens to show the driver and more. */
function TripCard({ trip, open, onPress }: { trip: TripSummary; open: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const pay = paymentOption(trip.paymentMethod);
  const when = new Date(trip.completedAt);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
      accessibilityLabel={t("Trip to {0}, {1}", trip.destinationName, formatNaira(trip.fare))} onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Card style={{ gap: 14, borderWidth: 1, borderColor: open ? colors.green : colors.line }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Route line */}
          <View style={{ alignItems: "center", paddingTop: 5, width: 14 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.green, backgroundColor: colors.paper }} />
            <View style={{ flex: 1, width: 2, marginVertical: 3, borderRadius: 1, backgroundColor: colors.line }} />
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.ink }} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
            <View>
              <Txt variant="caption" color="muted" numberOfLines={1}>{t("From {0}", trip.pickupName)}</Txt>
              <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodySemi }} tabular>{formatTime(when)}</Txt>
            </View>
            <Txt variant="bodyStrong" numberOfLines={2} style={{ fontSize: 16 }}>{trip.destinationName}</Txt>
          </View>
          <View style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
            <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 18 }} tabular>{formatNaira(trip.fare)}</Txt>
            <View style={{ width: 64, height: 40, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
              <VehicleArt type={trip.rideType} width={56} />
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip icon={trip.rideType === "keke" ? "keke" : "car"} text={trip.rideType === "keke" ? t("Keke") : t("Car")} />
          <Chip icon="route" text={formatKm(trip.distanceKm)} />
          <Chip icon={pay.icon} text={pay.label} tone={isInApp(trip.paymentMethod) ? "green" : "amber"} />
        </View>

        {open ? (
          <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={trip.driverName} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="caption" color="muted">{t("Your driver")}</Txt>
                <Txt variant="bodyStrong" numberOfLines={1}>{trip.driverName}</Txt>
              </View>
            </View>
            <Detail label={t("Date")} value={`${dayLabel(trip.completedAt)} · ${formatTime(when)}`} />
            <Detail label={t("Distance")} value={formatKm(trip.distanceKm)} />
            <Detail label={t("Paid with")} value={`${pay.label} · ${isInApp(trip.paymentMethod) ? t("in the app") : t("to the driver")}`} />
            <Detail label={t("Fare")} value={formatNaira(trip.fare)} strong />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Chip({ icon, text, tone = "neutral" }: { icon: React.ComponentProps<typeof Icon>["name"]; text: string; tone?: "neutral" | "green" | "amber" }) {
  const { colors } = useTheme();
  const c = { neutral: { bg: colors.mist, fg: colors.ink }, green: { bg: colors.greenSoft, fg: colors.greenText }, amber: { bg: colors.amberSoft, fg: colors.amberText } }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Icon name={icon} size={14} color={c.fg} />
      <Txt variant="label" style={{ fontSize: 12, color: c.fg }}>{text}</Txt>
    </View>
  );
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Txt color="muted">{label}</Txt>
      <Txt variant={strong ? "bodyStrong" : "body"} tabular style={{ flexShrink: 1, textAlign: "right" }}>{value}</Txt>
    </View>
  );
}

function Skeleton() {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ height: 12, width: "40%", borderRadius: 6, backgroundColor: colors.mist }} />
      <View style={{ height: 16, width: "75%", borderRadius: 8, backgroundColor: colors.mist }} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[60, 50, 80].map((w) => <View key={w} style={{ height: 22, width: w, borderRadius: 11, backgroundColor: colors.mist }} />)}
      </View>
    </Card>
  );
}
